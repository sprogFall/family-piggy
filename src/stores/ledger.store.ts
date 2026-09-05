import { create } from 'zustand';

import { ledgerService } from '@/services/ledger.service';
import { familyService, type FamilyWithLedger } from '@/services/family.service';
import { useAuthStore } from '@/stores/auth.store';
import type { FamilyMember, Ledger } from '@/types/domain';

type LedgerStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LedgerState {
  status: LedgerStatus;
  ledgers: Ledger[];
  families: FamilyWithLedger[];
  activeLedgerId: string | null;
  members: Record<string, FamilyMember[]>;
  load: () => Promise<void>;
  setActive: (id: string) => void;
  setBudget: (ledgerId: string, monthlyBudget: number) => Promise<void>;
  createPersonalLedger: (name: string) => Promise<void>;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (code: string) => Promise<void>;
  loadMembers: (familyId: string) => Promise<void>;
  removeMember: (familyId: string, userId: string) => Promise<void>;
  leaveFamily: (familyId: string) => Promise<void>;
  disbandFamily: (familyId: string) => Promise<void>;
  reset: () => void;
}

const currentUserId = (): string => {
  const userId = useAuthStore.getState().session?.user.id;
  if (!userId) throw new Error('未登录');
  return userId;
};

export const useLedgerStore = create<LedgerState>((set, get) => ({
  status: 'idle',
  ledgers: [],
  families: [],
  activeLedgerId: null,
  members: {},

  load: async () => {
    set({ status: 'loading' });
    try {
      const [ledgers, families] = await Promise.all([
        ledgerService.listLedgers(),
        familyService.listMyFamilies(),
      ]);
      const activeLedgerId =
        get().activeLedgerId && ledgers.some((l) => l.id === get().activeLedgerId)
          ? get().activeLedgerId
          : (ledgers[0]?.id ?? null);
      set({ ledgers, families, activeLedgerId, status: 'ready' });
    } catch {
      set({ status: 'error' });
      throw new Error('加载账本失败');
    }
  },

  setActive: (id) => set({ activeLedgerId: id }),

  setBudget: async (ledgerId, monthlyBudget) => {
    await ledgerService.updateBudget(ledgerId, monthlyBudget);
    set({
      ledgers: get().ledgers.map((ledger) =>
        ledger.id === ledgerId ? { ...ledger, monthlyBudget } : ledger,
      ),
    });
  },

  createPersonalLedger: async (name) => {
    await ledgerService.createLedger({
      name,
      type: 'personal',
      ownerId: currentUserId(),
      familyId: null,
    });
    await get().load();
  },

  createFamily: async (name) => {
    const { ledgerId } = await familyService.createFamily(name, currentUserId());
    await get().load();
    if (ledgerId) set({ activeLedgerId: ledgerId });
  },

  joinFamily: async (code) => {
    const { ledgerId } = await familyService.joinFamily(code);
    await get().load();
    if (ledgerId) set({ activeLedgerId: ledgerId });
  },

  loadMembers: async (familyId) => {
    const members = await familyService.listMembers(familyId);
    set({ members: { ...get().members, [familyId]: members } });
  },

  removeMember: async (familyId, userId) => {
    const family = get().families.find((f) => f.family.id === familyId)?.family;
    await familyService.removeMember(familyId, userId, family?.ownerId ?? '');
    await get().loadMembers(familyId);
  },

  leaveFamily: async (familyId) => {
    await familyService.leaveFamily(familyId, currentUserId());
    set({
      families: get().families.filter((f) => f.family.id !== familyId),
      members: { ...get().members, [familyId]: [] },
    });
    await get().load();
  },

  disbandFamily: async (familyId) => {
    await familyService.disbandFamily(familyId);
    set({
      families: get().families.filter((f) => f.family.id !== familyId),
      members: { ...get().members, [familyId]: [] },
    });
    await get().load();
  },

  reset: () =>
    set({ status: 'idle', ledgers: [], families: [], activeLedgerId: null, members: {} }),
}));

export const selectActiveLedger = (state: LedgerState): Ledger | null =>
  state.ledgers.find((l) => l.id === state.activeLedgerId) ?? state.ledgers[0] ?? null;
