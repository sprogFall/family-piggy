import { create } from 'zustand';

import { tagService } from '@/services/tag.service';
import type { Tag, TagInput } from '@/types/domain';

/** 按分类分组存放，保证选择器返回的数组引用稳定（zustand v5 快照要求） */
type LedgerTags = Record<string, Tag[]>;

interface TagState {
  byLedger: Record<string, LedgerTags>;
  load: (ledgerId: string) => Promise<void>;
  /** 记账时确保标签存在：同分类下同名标签复用已有记录，不重复创建 */
  ensure: (input: TagInput) => Promise<Tag>;
  remove: (id: string, ledgerId: string) => Promise<void>;
  reset: () => void;
}

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

export const useTagStore = create<TagState>((set, get) => ({
  byLedger: {},

  load: async (ledgerId) => {
    const tags = await tagService.list(ledgerId);
    set({ byLedger: { ...get().byLedger, [ledgerId]: groupByCategory(tags) } });
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
  },

  reset: () => set({ byLedger: {} }),
}));

/** 某账本某分类下的标签；未选分类或未加载时返回稳定的空数组 */
export const selectTags = (
  state: TagState,
  ledgerId: string | null | undefined,
  categoryId: string | null | undefined,
): Tag[] =>
  ledgerId && categoryId
    ? ((state.byLedger[ledgerId] ?? EMPTY_LEDGER_TAGS)[categoryId] ?? EMPTY_TAGS)
    : EMPTY_TAGS;
