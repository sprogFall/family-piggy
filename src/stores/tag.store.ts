import { create } from 'zustand';

import { tagService } from '@/services/tag.service';
import type { Tag, TagInput, TxKind } from '@/types/domain';

/** 按收支类型分组存放，保证选择器返回的数组引用稳定（zustand v5 快照要求） */
type LedgerTags = Record<TxKind, Tag[]>;

interface TagState {
  byLedger: Record<string, LedgerTags>;
  load: (ledgerId: string) => Promise<void>;
  /** 记账时确保标签存在：同名标签复用已有记录，不重复创建 */
  ensure: (input: TagInput) => Promise<Tag>;
  remove: (id: string, ledgerId: string) => Promise<void>;
  reset: () => void;
}

const EMPTY_TAGS: Tag[] = [];
const EMPTY_LEDGER_TAGS: LedgerTags = { expense: EMPTY_TAGS, income: EMPTY_TAGS };

const byName = (a: Tag, b: Tag): number => a.name.localeCompare(b.name);

const groupByKind = (tags: Tag[]): LedgerTags => ({
  expense: tags.filter((tag) => tag.kind === 'expense').sort(byName),
  income: tags.filter((tag) => tag.kind === 'income').sort(byName),
});

const mergeTags = (current: Tag[], incoming: Tag[]): Tag[] => {
  const byId = new Map(current.map((tag) => [tag.id, tag]));
  for (const tag of incoming) byId.set(tag.id, tag);
  return [...byId.values()].sort(byName);
};

export const useTagStore = create<TagState>((set, get) => ({
  byLedger: {},

  load: async (ledgerId) => {
    const tags = await tagService.list(ledgerId);
    set({ byLedger: { ...get().byLedger, [ledgerId]: groupByKind(tags) } });
  },

  ensure: async (input) => {
    const tag = await tagService.ensure(input);
    const ledgerTags = get().byLedger[input.ledgerId] ?? EMPTY_LEDGER_TAGS;
    set({
      byLedger: {
        ...get().byLedger,
        [input.ledgerId]: {
          ...ledgerTags,
          [input.kind]: mergeTags(ledgerTags[input.kind], [tag]),
        },
      },
    });
    return tag;
  },

  remove: async (id, ledgerId) => {
    await tagService.remove(id);
    const ledgerTags = get().byLedger[ledgerId] ?? EMPTY_LEDGER_TAGS;
    set({
      byLedger: {
        ...get().byLedger,
        [ledgerId]: {
          expense: ledgerTags.expense.filter((tag) => tag.id !== id),
          income: ledgerTags.income.filter((tag) => tag.id !== id),
        },
      },
    });
  },

  reset: () => set({ byLedger: {} }),
}));

export const selectTags = (
  state: TagState,
  ledgerId: string | null | undefined,
  kind: TxKind,
): Tag[] => (ledgerId ? (state.byLedger[ledgerId] ?? EMPTY_LEDGER_TAGS)[kind] : EMPTY_TAGS);
