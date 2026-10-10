import { create } from 'zustand';

import { readSnapshot, removeSnapshot, writeSnapshot } from '@/lib/snapshot';
import { categoryService, type CategoryPatch } from '@/services/category.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Category, CategoryInput } from '@/types/domain';

interface CategoryState {
  /** 当前数据与快照归属的账号：登出后 session 已清空，靠它定位要清理的缓存 key */
  ownerId: string | null;
  byLedger: Record<string, Category[]>;
  hydrate: (userId: string) => Promise<void>;
  load: (ledgerId: string) => Promise<void>;
  create: (input: CategoryInput) => Promise<Category>;
  update: (id: string, ledgerId: string, patch: CategoryPatch) => Promise<void>;
  remove: (id: string, ledgerId: string) => Promise<void>;
  reset: () => void;
}

/** 记名快照 key：带 userId，避免同设备切换账号读到别人的分类 */
export const categorySnapshotKey = (userId: string): string => `categories:${userId}`;

const sortCategories = (list: Category[]): Category[] =>
  [...list].sort((a, b) =>
    a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind.localeCompare(b.kind),
  );

export const useCategoryStore = create<CategoryState>((set, get) => {
  /** 落盘分类快照；空数据不写，避免一次异常的空结果把可用缓存擦掉 */
  const persistSnapshot = (): void => {
    const { ownerId, byLedger } = get();
    if (!ownerId || Object.keys(byLedger).length === 0) return;
    writeSnapshot(categorySnapshotKey(ownerId), byLedger);
  };

  return {
    ownerId: null,
    byLedger: {},

    hydrate: async (userId) => {
      set({ ownerId: userId });
      const snapshot = await readSnapshot<Record<string, Category[]>>(categorySnapshotKey(userId));
      // 读取期间可能已登出或切换账号：丢弃过期快照，避免把别人的分类铺到界面上
      if (get().ownerId !== userId) return;
      if (!snapshot) return;
      set({ byLedger: snapshot });
    },

    load: async (ledgerId) => {
      const userId = useAuthStore.getState().session?.user.id;
      if (userId) set({ ownerId: userId });
      const categories = await categoryService.list(ledgerId);
      set({ byLedger: { ...get().byLedger, [ledgerId]: categories } });
      persistSnapshot();
    },

    create: async (input) => {
      const created = await categoryService.create(input);
      const list = get().byLedger[input.ledgerId] ?? [];
      set({
        byLedger: {
          ...get().byLedger,
          [input.ledgerId]: sortCategories([...list, created]),
        },
      });
      persistSnapshot();
      return created;
    },

    update: async (id, ledgerId, patch) => {
      await categoryService.update(id, patch);
      const list = get().byLedger[ledgerId] ?? [];
      set({
        byLedger: {
          ...get().byLedger,
          [ledgerId]: list.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        },
      });
      persistSnapshot();
    },

    remove: async (id, ledgerId) => {
      await categoryService.remove(id);
      const list = get().byLedger[ledgerId] ?? [];
      set({
        byLedger: { ...get().byLedger, [ledgerId]: list.filter((c) => c.id !== id) },
      });
      persistSnapshot();
    },

    reset: () => {
      const { ownerId } = get();
      if (ownerId) void removeSnapshot(categorySnapshotKey(ownerId));
      set({ ownerId: null, byLedger: {} });
    },
  };
});

/** 未加载/无账本时返回模块级空数组：zustand v5 的 useSyncExternalStore 要求快照引用稳定，否则无限重渲染 */
const EMPTY_CATEGORIES: Category[] = [];

export const selectCategories = (
  state: CategoryState,
  ledgerId: string | null | undefined,
): Category[] =>
  ledgerId ? (state.byLedger[ledgerId] ?? EMPTY_CATEGORIES) : EMPTY_CATEGORIES;
