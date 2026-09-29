import { create } from 'zustand';

import { monthKey, monthRangeISO, type MonthRef } from '@/domain/dates';
import {
  subscribeTransactions,
  transactionService,
} from '@/services/transaction.service';
import { useAuthStore } from '@/stores/auth.store';
import type {
  CreateTransactionInput,
  Transaction,
  UpdateTransactionInput,
} from '@/types/domain';

type BucketStatus = 'loading' | 'ready' | 'error';

export interface MonthBucket {
  status: BucketStatus;
  transactions: Transaction[];
}

interface TransactionState {
  buckets: Record<string, MonthBucket>;
  loadMonth: (ledgerId: string, month: MonthRef) => Promise<void>;
  loadYear: (ledgerId: string, year: number) => Promise<void>;
  add: (input: CreateTransactionInput) => Promise<Transaction>;
  update: (id: string, ledgerId: string, patch: UpdateTransactionInput) => Promise<void>;
  remove: (id: string, ledgerId: string) => Promise<void>;
  upsertLocal: (ledgerId: string, tx: Transaction) => void;
  deleteLocal: (ledgerId: string, id: string) => void;
  subscribe: (ledgerId: string) => () => void;
  reset: () => void;
}

const bucketKey = (ledgerId: string, month: MonthRef): string =>
  `${ledgerId}::${monthKey(month)}`;

const yearBucketKey = (ledgerId: string, year: number): string => `${ledgerId}::${year}`;

const contains = (iso: string, month: MonthRef): boolean => {
  const time = new Date(iso).getTime();
  const { start, end } = monthRangeISO(month);
  return time >= new Date(start).getTime() && time < new Date(end).getTime();
};

const sortByTimeDesc = (list: Transaction[]): Transaction[] =>
  [...list].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

const monthOfKey = (key: string): MonthRef => {
  const [, ym] = key.split('::');
  const [year, month] = ym.split('-').map(Number);
  return { year, month };
};

/** 判断某个月桶 / 年桶是否包含该流水 */
const bucketIncludesTransaction = (key: string, transaction: Transaction): boolean => {
  const [, period] = key.split('::');
  if (/^\d{4}$/.test(period)) {
    return new Date(transaction.occurredAt).getFullYear() === Number(period);
  }
  return contains(transaction.occurredAt, monthOfKey(key));
};

export const useTransactionStore = create<TransactionState>((set, get) => {
  const patchLedgerBuckets = (
    ledgerId: string,
    transform: (transactions: Transaction[]) => Transaction[],
  ) => {
    const buckets = { ...get().buckets };
    for (const key of Object.keys(buckets)) {
      if (!key.startsWith(`${ledgerId}::`)) continue;
      buckets[key] = { ...buckets[key], transactions: transform(buckets[key].transactions) };
    }
    set({ buckets });
  };

  return {
    buckets: {},

    loadMonth: async (ledgerId, month) => {
      const key = bucketKey(ledgerId, month);
      set({
        buckets: {
          ...get().buckets,
          [key]: { status: 'loading', transactions: get().buckets[key]?.transactions ?? [] },
        },
      });
      try {
        const { start, end } = monthRangeISO(month);
        const transactions = await transactionService.listMonth(ledgerId, start, end);
        set({
          buckets: { ...get().buckets, [key]: { status: 'ready', transactions } },
        });
      } catch {
        set({ buckets: { ...get().buckets, [key]: { status: 'error', transactions: [] } } });
      }
    },

    loadYear: async (ledgerId, year) => {
      const key = yearBucketKey(ledgerId, year);
      set({
        buckets: {
          ...get().buckets,
          [key]: { status: 'loading', transactions: get().buckets[key]?.transactions ?? [] },
        },
      });
      try {
        const start = new Date(year, 0, 1, 0, 0, 0, 0).toISOString();
        const end = new Date(year + 1, 0, 1, 0, 0, 0, 0).toISOString();
        const transactions = await transactionService.listMonth(ledgerId, start, end);
        set({
          buckets: { ...get().buckets, [key]: { status: 'ready', transactions } },
        });
      } catch {
        set({ buckets: { ...get().buckets, [key]: { status: 'error', transactions: [] } } });
      }
    },

    add: async (input) => {
      const userId = useAuthStore.getState().session?.user.id;
      if (!userId) throw new Error('未登录');
      const tx = await transactionService.create(input, userId);
      patchLedgerBuckets(input.ledgerId, (list) =>
        sortByTimeDesc([...list.filter((t) => t.id !== tx.id), tx]),
      );
      return tx;
    },

    update: async (id, ledgerId, patch) => {
      await transactionService.update(id, patch);
      patchLedgerBuckets(ledgerId, (list) => list.filter((t) => t.id !== id));
      // 若该账本当前月份桶包含此流水则重新拉取，保证跨月修改后归属正确
      const state = get();
      for (const key of Object.keys(state.buckets)) {
        if (key.startsWith(`${ledgerId}::`)) {
          await state.loadMonth(ledgerId, monthOfKey(key));
        }
      }
    },

    remove: async (id, ledgerId) => {
      await transactionService.remove(id);
      patchLedgerBuckets(ledgerId, (list) => list.filter((t) => t.id !== id));
    },

    upsertLocal: (ledgerId, tx) => {
      patchLedgerBuckets(ledgerId, (list) => {
        const without = list.filter((t) => t.id !== tx.id);
        return sortByTimeDesc(without);
      });
      // 仅在流水所属月份 / 年份桶已加载时插入
      const buckets = { ...get().buckets };
      for (const key of Object.keys(buckets)) {
        if (!key.startsWith(`${ledgerId}::`)) continue;
        if (!bucketIncludesTransaction(key, tx)) continue;
        buckets[key] = {
          ...buckets[key],
          transactions: sortByTimeDesc([tx, ...buckets[key].transactions.filter((t) => t.id !== tx.id)]),
        };
      }
      set({ buckets });
    },

    deleteLocal: (ledgerId, id) => {
      patchLedgerBuckets(ledgerId, (list) => list.filter((t) => t.id !== id));
    },

    subscribe: (ledgerId) =>
      subscribeTransactions(ledgerId, {
        onUpsert: (tx) => get().upsertLocal(ledgerId, tx),
        onDelete: (id) => get().deleteLocal(ledgerId, id),
      }),

    reset: () => set({ buckets: {} }),
  };
});

export const selectMonthBucket = (
  state: TransactionState,
  ledgerId: string | null | undefined,
  month: MonthRef,
): MonthBucket | undefined =>
  ledgerId ? state.buckets[bucketKey(ledgerId, month)] : undefined;

/** 未加载/无账本时返回模块级空数组：zustand v5 的 useSyncExternalStore 要求快照引用稳定，否则无限重渲染 */
const EMPTY_TRANSACTIONS: Transaction[] = [];

export const selectMonthTransactions = (
  state: TransactionState,
  ledgerId: string | null | undefined,
  month: MonthRef,
): Transaction[] =>
  ledgerId
    ? (selectMonthBucket(state, ledgerId, month)?.transactions ?? EMPTY_TRANSACTIONS)
    : EMPTY_TRANSACTIONS;

/** 某账本某年的流水；未加载时返回稳定的空数组 */
export const selectYearTransactions = (
  state: TransactionState,
  ledgerId: string | null | undefined,
  year: number,
): Transaction[] => {
  if (!ledgerId) return EMPTY_TRANSACTIONS;
  return state.buckets[yearBucketKey(ledgerId, year)]?.transactions ?? EMPTY_TRANSACTIONS;
};

/** 在所有已加载月份桶中查找流水（编辑入口来自账单列表，桶必然已加载） */
export const selectTransactionById = (
  state: TransactionState,
  id: string | null | undefined,
): Transaction | undefined => {
  if (!id) return undefined;
  for (const bucket of Object.values(state.buckets)) {
    const found = bucket.transactions.find((tx) => tx.id === id);
    if (found) return found;
  }
  return undefined;
};
