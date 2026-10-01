import { create } from 'zustand';

import { recurringRuleService } from '@/services/recurring-rule.service';
import { useAuthStore } from '@/stores/auth.store';
import type {
  CreateRecurringRuleInput,
  RecurringRule,
  UpdateRecurringRuleInput,
} from '@/types/domain';

interface RecurringRuleState {
  byLedger: Record<string, RecurringRule[]>;
  load: (ledgerId: string) => Promise<void>;
  create: (input: CreateRecurringRuleInput) => Promise<RecurringRule>;
  update: (id: string, ledgerId: string, patch: UpdateRecurringRuleInput) => Promise<void>;
  remove: (id: string, ledgerId: string) => Promise<void>;
  reset: () => void;
}

export const useRecurringRuleStore = create<RecurringRuleState>((set, get) => ({
  byLedger: {},

  load: async (ledgerId) => {
    const rules = await recurringRuleService.list(ledgerId);
    set({ byLedger: { ...get().byLedger, [ledgerId]: rules } });
  },

  create: async (input) => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) throw new Error('未登录');
    const created = await recurringRuleService.create(input, userId);
    const list = get().byLedger[input.ledgerId] ?? [];
    set({
      byLedger: {
        ...get().byLedger,
        [input.ledgerId]: [created, ...list.filter((rule) => rule.id !== created.id)],
      },
    });
    return created;
  },

  update: async (id, ledgerId, patch) => {
    await recurringRuleService.update(id, patch);
    const list = get().byLedger[ledgerId] ?? [];
    set({
      byLedger: {
        ...get().byLedger,
        [ledgerId]: list.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
      },
    });
  },

  remove: async (id, ledgerId) => {
    await recurringRuleService.remove(id);
    const list = get().byLedger[ledgerId] ?? [];
    set({
      byLedger: { ...get().byLedger, [ledgerId]: list.filter((rule) => rule.id !== id) },
    });
  },

  reset: () => set({ byLedger: {} }),
}));

/** 未加载/无账本时返回模块级空数组：zustand v5 的 useSyncExternalStore 要求快照引用稳定 */
const EMPTY_RULES: RecurringRule[] = [];

export const selectRecurringRules = (
  state: RecurringRuleState,
  ledgerId: string | null | undefined,
): RecurringRule[] => (ledgerId ? (state.byLedger[ledgerId] ?? EMPTY_RULES) : EMPTY_RULES);

/** 在全部已加载账本中按 ID 查找，供编辑页进入时回填 */
export const selectRecurringRuleById = (
  state: RecurringRuleState,
  id: string | null | undefined,
): RecurringRule | undefined => {
  if (!id) return undefined;
  for (const rules of Object.values(state.byLedger)) {
    const found = rules.find((rule) => rule.id === id);
    if (found) return found;
  }
  return undefined;
};
