import AsyncStorage from '@react-native-async-storage/async-storage';
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

/** 记名持久化 key：不同账号在同一设备上各自记住上次打开的账本 */
export const activeLedgerStorageKey = (userId: string): string => `ledger:active:${userId}`;

const readStoredActiveLedgerId = async (userId: string | undefined): Promise<string | null> => {
  if (!userId) return null;
  try {
    return await AsyncStorage.getItem(activeLedgerStorageKey(userId));
  } catch {
    return null;
  }
};

const persistActiveLedgerId = (userId: string | undefined, ledgerId: string): void => {
  if (!userId) return;
  void AsyncStorage.setItem(activeLedgerStorageKey(userId), ledgerId).catch(() => undefined);
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
      const userId = useAuthStore.getState().session?.user.id;
      const [ledgers, families, storedActiveLedgerId] = await Promise.all([
        ledgerService.listLedgers(),
        familyService.listMyFamilies(),
        readStoredActiveLedgerId(userId),
      ]);
      const preferredLedgerId = get().activeLedgerId ?? storedActiveLedgerId;
      const activeLedgerId =
        preferredLedgerId && ledgers.some((l) => l.id === preferredLedgerId)
          ? preferredLedgerId
          : (ledgers[0]?.id ?? null);
      set({ ledgers, families, activeLedgerId, status: 'ready' });
    } catch {
      set({ status: 'error' });
      throw new Error('加载账本失败');
    }
  },

  setActive: (id) => {
    set({ activeLedgerId: id });
    persistActiveLedgerId(useAuthStore.getState().session?.user.id, id);
  },

  setBudget: async (ledgerId, monthlyBudget) => {
    await ledgerService.updateBudget(ledgerId, monthlyBudget);
    set({
      ledgers: get().ledgers.map((ledger) =>
        ledger.id === ledgerId ? { ...ledger, monthlyBudget } : ledger,
      ),
    });
  },

  createPersonalLedger: async (name) => {
    const before = new Set(get().ledgers.map((ledger) => ledger.id));
    await ledgerService.createLedger({
      name,
      type: 'personal',
      ownerId: currentUserId(),
      familyId: null,
    });
    await get().load();
    // 新建账本无法用 INSERT ... RETURNING 取回（见 ledger.service），故按新增的 ID 切换
    const created = get().ledgers.find((ledger) => !before.has(ledger.id));
    if (created) get().setActive(created.id);
  },

  createFamily: async (name) => {
    const { ledgerId } = await familyService.createFamily(name, currentUserId());
    await get().load();
    if (ledgerId) get().setActive(ledgerId);
  },

  joinFamily: async (code) => {
    const { ledgerId } = await familyService.joinFamily(code);
    await get().load();
    if (ledgerId) get().setActive(ledgerId);
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

/** 未加载/无成员时返回模块级空数组：zustand v5 的 useSyncExternalStore 要求快照引用稳定，否则无限重渲染 */
const EMPTY_MEMBERS: FamilyMember[] = [];

export const selectMembers = (state: LedgerState, familyId: string): FamilyMember[] =>
  state.members[familyId] ?? EMPTY_MEMBERS;
