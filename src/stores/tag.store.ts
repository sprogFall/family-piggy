import { create } from 'zustand';

import { readSnapshot, removeSnapshot, writeSnapshot } from '@/lib/snapshot';
import { tagService } from '@/services/tag.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Tag, TagInput } from '@/types/domain';

/** 按分类分组存放，保证选择器返回的数组引用稳定（zustand v5 快照要求） */
type LedgerTags = Record<string, Tag[]>;

interface TagState {
  /** 当前数据与快照归属的账号：登出后 session 已清空，靠它定位要清理的缓存 key */
  ownerId: string | null;
  byLedger: Record<string, LedgerTags>;
  hydrate: (userId: string) => Promise<void>;
  load: (ledgerId: string) => Promise<void>;
  /** 记账时确保标签存在：同分类下同名标签复用已有记录，不重复创建 */
  ensure: (input: TagInput) => Promise<Tag>;
  remove: (id: string, ledgerId: string) => Promise<void>;
  reset: () => void;
}

/** 记名快照 key：带 userId，避免同设备切换账号读到别人的标签 */
export const tagSnapshotKey = (userId: string): string => `tags:${userId}`;

const EMPTY_TAGS: Tag[] = [];
const EMPTY_LEDGER_TAGS: LedgerTags = {};

const byName = (a: Tag, b: Tag): number => a.name.localeCompare(b.name);

const groupByCategory = (tags: Tag[]): LedgerTags => {
  const grouped: LedgerTags = {};
  for (const tag of tags) {
    grouped[tag.categoryId] = [...(grouped[tag.categoryId] ?? []), tag].sort(byName);
  }
  return grouped;
};

const mergeTags = (current: Tag[], incoming: Tag[]): Tag[] => {
  const byId = new Map(current.map((tag) => [tag.id, tag]));
  for (const tag of incoming) byId.set(tag.id, tag);
  return [...byId.values()].sort(byName);
};

export const useTagStore = create<TagState>((set, get) => {
  /** 落盘标签快照；空数据不写，避免一次异常的空结果把可用缓存擦掉 */
  const persistSnapshot = (): void => {
    const { ownerId, byLedger } = get();
    if (!ownerId || Object.keys(byLedger).length === 0) return;
    writeSnapshot(tagSnapshotKey(ownerId), byLedger);
  };

  return {
    ownerId: null,
    byLedger: {},

    hydrate: async (userId) => {
      set({ ownerId: userId });
      const snapshot = await readSnapshot<Record<string, LedgerTags>>(tagSnapshotKey(userId));
      // 读取期间可能已登出或切换账号：丢弃过期快照，避免把别人的标签铺到界面上
      if (get().ownerId !== userId) return;
      if (!snapshot) return;
      set({ byLedger: snapshot });
    },

    load: async (ledgerId) => {
      const userId = useAuthStore.getState().session?.user.id;
      if (userId) set({ ownerId: userId });
      const tags = await tagService.list(ledgerId);
      set({ byLedger: { ...get().byLedger, [ledgerId]: groupByCategory(tags) } });
      persistSnapshot();
    },

    ensure: async (input) => {
      const tag = await tagService.ensure(input);
      const ledgerTags = get().byLedger[input.ledgerId] ?? EMPTY_LEDGER_TAGS;
      set({
        byLedger: {
          ...get().byLedger,
          [input.ledgerId]: {
            ...ledgerTags,
            [input.categoryId]: mergeTags(ledgerTags[input.categoryId] ?? EMPTY_TAGS, [tag]),
          },
        },
      });
      persistSnapshot();
      return tag;
    },

    remove: async (id, ledgerId) => {
      await tagService.remove(id);
      const ledgerTags = get().byLedger[ledgerId] ?? EMPTY_LEDGER_TAGS;
      const next: LedgerTags = {};
      for (const [categoryId, tags] of Object.entries(ledgerTags)) {
        next[categoryId] = tags.filter((tag) => tag.id !== id);
      }
      set({ byLedger: { ...get().byLedger, [ledgerId]: next } });
      persistSnapshot();
    },

    reset: () => {
      const { ownerId } = get();
      if (ownerId) void removeSnapshot(tagSnapshotKey(ownerId));
      set({ ownerId: null, byLedger: {} });
    },
  };
});

/** 某账本某分类下的标签；未选分类或未加载时返回稳定的空数组 */
export const selectTags = (
  state: TagState,
  ledgerId: string | null | undefined,
  categoryId: string | null | undefined,
): Tag[] =>
  ledgerId && categoryId
    ? ((state.byLedger[ledgerId] ?? EMPTY_LEDGER_TAGS)[categoryId] ?? EMPTY_TAGS)
    : EMPTY_TAGS;
