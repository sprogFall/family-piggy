import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { readSnapshot, removeSnapshot, writeSnapshot } from '@/lib/snapshot';
import { ledgerService } from '@/services/ledger.service';
import { familyService, type FamilyWithLedger } from '@/services/family.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Family, FamilyMember, Ledger } from '@/types/domain';

type LedgerStatus = 'idle' | 'loading' | 'ready' | 'error';

/** 账本与家庭列表的快照：启动时先用它渲染，再由网络结果覆盖 */
interface LedgerSnapshot {
  ledgers: Ledger[];
  families: FamilyWithLedger[];
}

interface LedgerState {
  /** 当前数据与快照归属的账号：登出后 session 已清空，靠它定位要清理的缓存 key */
  ownerId: string | null;
  status: LedgerStatus;
  ledgers: Ledger[];
  families: FamilyWithLedger[];
  activeLedgerId: string | null;
  members: Record<string, FamilyMember[]>;
  hydrate: (userId: string) => Promise<void>;
  load: () => Promise<void>;
  setActive: (id: string) => void;
  setBudget: (ledgerId: string, monthlyBudget: number) => Promise<void>;
  createPersonalLedger: (name: string) => Promise<void>;
  renameLedger: (id: string, name: string) => Promise<void>;
  removeLedger: (id: string) => Promise<void>;
  createFamily: (name: string) => Promise<void>;
  renameFamily: (familyId: string, name: string) => Promise<void>;
  regenerateInviteCode: (familyId: string) => Promise<string>;
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

/** 记名快照 key：带 userId，避免同设备切换账号读到别人的账本 */
export const ledgerSnapshotKey = (userId: string): string => `ledger:list:${userId}`;

/**
 * 家庭账本 ID 本地关联：家庭账本已由 listLedgers（RLS 可见个人 + 家庭账本）返回，
 * 因此不必再为每个家庭额外查询一次 ledgers。
 */
const attachLedgerIds = (families: Family[], ledgers: Ledger[]): FamilyWithLedger[] =>
  families.map((family) => ({
    family,
    ledgerId: ledgers.find((ledger) => ledger.familyId === family.id)?.id ?? null,
  }));

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

export const useLedgerStore = create<LedgerState>((set, get) => {
  /** 落盘账本与家庭快照；空列表不写，避免一次异常的空结果把可用缓存擦掉 */
  const persistSnapshot = (): void => {
    const { ownerId, ledgers, families } = get();
    if (!ownerId || ledgers.length === 0) return;
    writeSnapshot(ledgerSnapshotKey(ownerId), { ledgers, families });
  };

  return {
    ownerId: null,
    status: 'idle',
    ledgers: [],
    families: [],
    activeLedgerId: null,
    members: {},

    hydrate: async (userId) => {
      set({ ownerId: userId });
      const [snapshot, storedActiveLedgerId] = await Promise.all([
        readSnapshot<LedgerSnapshot>(ledgerSnapshotKey(userId)),
        readStoredActiveLedgerId(userId),
      ]);
      // 读取期间可能已登出或切换账号：丢弃过期快照，避免把别人的账本铺到界面上
      if (get().ownerId !== userId) return;
      if (!snapshot || snapshot.ledgers.length === 0) return;
      const activeLedgerId =
        storedActiveLedgerId && snapshot.ledgers.some((item) => item.id === storedActiveLedgerId)
          ? storedActiveLedgerId
          : (snapshot.ledgers[0]?.id ?? null);
      set({
        ledgers: snapshot.ledgers,
        families: snapshot.families,
        activeLedgerId,
        status: 'ready',
      });
    },

    load: async () => {
      set({ status: 'loading' });
      try {
        const userId = useAuthStore.getState().session?.user.id;
        if (userId) set({ ownerId: userId });
        const [ledgers, families, storedActiveLedgerId] = await Promise.all([
          ledgerService.listLedgers(),
          userId ? familyService.listFamilies(userId) : Promise.resolve<Family[]>([]),
          readStoredActiveLedgerId(userId),
        ]);
        const preferredLedgerId = get().activeLedgerId ?? storedActiveLedgerId;
        const activeLedgerId =
          preferredLedgerId && ledgers.some((l) => l.id === preferredLedgerId)
            ? preferredLedgerId
            : (ledgers[0]?.id ?? null);
        set({
          ledgers,
          families: attachLedgerIds(families, ledgers),
          activeLedgerId,
          status: 'ready',
        });
        persistSnapshot();
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
      persistSnapshot();
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

    renameLedger: async (id, name) => {
      await ledgerService.updateName(id, name);
      set({
        ledgers: get().ledgers.map((ledger) =>
          ledger.id === id ? { ...ledger, name } : ledger,
        ),
      });
      persistSnapshot();
    },

    removeLedger: async (id) => {
      await ledgerService.removeLedger(id);
      await get().load();
    },

    createFamily: async (name) => {
      const { ledgerId } = await familyService.createFamily(name, currentUserId());
      await get().load();
      if (ledgerId) get().setActive(ledgerId);
    },

    renameFamily: async (familyId, name) => {
      await familyService.renameFamily(familyId, name);
      set({
        families: get().families.map((item) =>
          item.family.id === familyId ? { ...item, family: { ...item.family, name } } : item,
        ),
        ledgers: get().ledgers.map((ledger) =>
          ledger.familyId === familyId ? { ...ledger, name } : ledger,
        ),
      });
      persistSnapshot();
    },

    regenerateInviteCode: async (familyId) => {
      const inviteCode = await familyService.regenerateInviteCode(familyId);
      set({
        families: get().families.map((item) =>
          item.family.id === familyId ? { ...item, family: { ...item.family, inviteCode } } : item,
        ),
      });
      persistSnapshot();
      return inviteCode;
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

    reset: () => {
      const { ownerId } = get();
      if (ownerId) void removeSnapshot(ledgerSnapshotKey(ownerId));
      set({
        ownerId: null,
        status: 'idle',
        ledgers: [],
        families: [],
        activeLedgerId: null,
        members: {},
      });
    },
  };
});

export const selectActiveLedger = (state: LedgerState): Ledger | null =>
  state.ledgers.find((l) => l.id === state.activeLedgerId) ?? state.ledgers[0] ?? null;

/** 未加载/无成员时返回模块级空数组：zustand v5 的 useSyncExternalStore 要求快照引用稳定，否则无限重渲染 */
const EMPTY_MEMBERS: FamilyMember[] = [];

export const selectMembers = (state: LedgerState, familyId: string): FamilyMember[] =>
  state.members[familyId] ?? EMPTY_MEMBERS;
