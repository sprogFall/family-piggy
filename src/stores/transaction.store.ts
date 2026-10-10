import { create } from 'zustand';

import { monthKey, monthRangeISO, type MonthRef } from '@/domain/dates';
import { recentMonthBuckets } from '@/domain/snapshot';
import { readSnapshot, removeSnapshot, writeSnapshot } from '@/lib/snapshot';
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

export interface PeriodBucket {
  status: BucketStatus;
  transactions: Transaction[];
  start: string;
  end: string;
}

/** 流水快照：只存月份桶，统计页的任意区间桶按需重拉即可 */
interface TransactionSnapshot {
  buckets: Record<string, MonthBucket>;
}

interface TransactionState {
  /** 当前数据与快照归属的账号：登出后 session 已清空，靠它定位要清理的缓存 key */
  ownerId: string | null;
  buckets: Record<string, MonthBucket>;
  /** 统计页按任意时间区间缓存的流水；key 由 PeriodRange.key 决定 */
  periodBuckets: Record<string, PeriodBucket>;
  hydrate: (userId: string) => Promise<void>;
  loadMonth: (ledgerId: string, month: MonthRef) => Promise<void>;
  loadPeriod: (ledgerId: string, periodKey: string, start: string, end: string) => Promise<void>;
  add: (input: CreateTransactionInput) => Promise<Transaction>;
  update: (id: string, ledgerId: string, patch: UpdateTransactionInput) => Promise<void>;
  remove: (id: string, ledgerId: string) => Promise<void>;
  upsertLocal: (ledgerId: string, tx: Transaction) => void;
  deleteLocal: (ledgerId: string, id: string) => void;
  subscribe: (ledgerId: string) => () => void;
  reset: () => void;
}

/** 记名快照 key：带 userId，避免同设备切换账号读到别人的流水 */
export const transactionSnapshotKey = (userId: string): string => `transactions:${userId}`;

/** 每个账本最多缓存最近 3 个月：首屏几乎只用到当月，超出部分重拉成本可接受 */
const SNAPSHOT_MONTH_LIMIT = 3;

const bucketKey = (ledgerId: string, month: MonthRef): string =>
  `${ledgerId}::${monthKey(month)}`;

const PERIOD_MARKER = '::period::';

const periodBucketKey = (ledgerId: string, periodKey: string): string =>
  `${ledgerId}${PERIOD_MARKER}${periodKey}`;

const periodKeyOfBucket = (key: string): string => key.split(PERIOD_MARKER)[1] ?? key;

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

/** 判断某个月桶是否包含该流水 */
const bucketIncludesTransaction = (key: string, transaction: Transaction): boolean =>
  contains(transaction.occurredAt, monthOfKey(key));

export const useTransactionStore = create<TransactionState>((set, get) => {
  /**
   * 落盘月份桶快照（每个账本裁剪到最近几个月）。
   *
   * 只落有流水的桶：空桶渲染出来与「加载中」无法区分，刷新时反而会退回全屏加载态。
   * 整个快照都为空时不写，避免用空结果覆盖掉可用缓存（真正的清理只在 reset 时发生）。
   */
  const persistSnapshot = (): void => {
    const { ownerId, buckets } = get();
    if (!ownerId) return;
    const nonEmpty = Object.fromEntries(
      Object.entries(buckets).filter(([, bucket]) => bucket.transactions.length > 0),
    );
    if (Object.keys(nonEmpty).length === 0) return;
    writeSnapshot(transactionSnapshotKey(ownerId), {
      buckets: recentMonthBuckets(nonEmpty, SNAPSHOT_MONTH_LIMIT),
    });
  };

  /** 记下当前数据归属的账号，保证后续写入落在正确的快照 key 上 */
  const syncOwner = (): void => {
    const userId = useAuthStore.getState().session?.user.id;
    if (userId && get().ownerId !== userId) set({ ownerId: userId });
  };

  const patchLedgerBuckets = (
    ledgerId: string,
    transform: (transactions: Transaction[]) => Transaction[],
  ) => {
    const buckets = { ...get().buckets };
    for (const key of Object.keys(buckets)) {
      if (!key.startsWith(`${ledgerId}::`)) continue;
      buckets[key] = { ...buckets[key], transactions: transform(buckets[key].transactions) };
    }
    const periodBuckets = { ...get().periodBuckets };
    for (const key of Object.keys(periodBuckets)) {
      if (!key.startsWith(`${ledgerId}${PERIOD_MARKER}`)) continue;
      periodBuckets[key] = {
        ...periodBuckets[key],
        transactions: transform(periodBuckets[key].transactions),
      };
    }
    set({ buckets, periodBuckets });
  };

  return {
    ownerId: null,
    buckets: {},
    periodBuckets: {},

    hydrate: async (userId) => {
      set({ ownerId: userId });
      const snapshot = await readSnapshot<TransactionSnapshot>(transactionSnapshotKey(userId));
      // 读取期间可能已登出或切换账号：丢弃过期快照，避免把别人的流水铺到界面上
      if (get().ownerId !== userId) return;
      if (!snapshot || Object.keys(snapshot.buckets).length === 0) return;
      // 只缓存过 ready 的桶，这里再兜一层，避免异常写入把 loading / error 态带回来
      const buckets: Record<string, MonthBucket> = {};
      for (const [key, bucket] of Object.entries(snapshot.buckets)) {
        buckets[key] = { status: 'ready', transactions: bucket.transactions };
      }
      set({ buckets });
    },

    loadMonth: async (ledgerId, month) => {
      syncOwner();
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
        persistSnapshot();
      } catch {
        // 拉取失败时保留旧快照：清空会让账单页把「加载失败」显示成「本月暂无账单」
        set({
          buckets: {
            ...get().buckets,
            [key]: { status: 'error', transactions: get().buckets[key]?.transactions ?? [] },
          },
        });
      }
    },

    loadPeriod: async (ledgerId, periodKey, start, end) => {
      syncOwner();
      const key = periodBucketKey(ledgerId, periodKey);
      set({
        periodBuckets: {
          ...get().periodBuckets,
          [key]: {
            status: 'loading',
            transactions: get().periodBuckets[key]?.transactions ?? [],
            start,
            end,
          },
        },
      });
      try {
        const transactions = await transactionService.listMonth(ledgerId, start, end);
        set({
          periodBuckets: {
            ...get().periodBuckets,
            [key]: { status: 'ready', transactions, start, end },
          },
        });
      } catch {
        // 同上：统计周期桶刷新失败时保留旧数据，避免统计页被清空
        set({
          periodBuckets: {
            ...get().periodBuckets,
            [key]: {
              status: 'error',
              transactions: get().periodBuckets[key]?.transactions ?? [],
              start,
              end,
            },
          },
        });
      }
    },

    add: async (input) => {
      const userId = useAuthStore.getState().session?.user.id;
      if (!userId) throw new Error('未登录');
      const tx = await transactionService.create(input, userId);
      patchLedgerBuckets(input.ledgerId, (list) =>
        sortByTimeDesc([...list.filter((t) => t.id !== tx.id), tx]),
      );
      persistSnapshot();
      return tx;
    },

    update: async (id, ledgerId, patch) => {
      await transactionService.update(id, patch);
      // 不在重拉前删除本地快照：重拉成功才用服务端数据替换，失败时保留旧数据并置 error。
      // 跨月修改仍由这里重拉各已加载桶完成：旧月桶查不到该流水即被移除，新月桶会补上。
      const state = get();
      for (const key of Object.keys(state.buckets)) {
        if (key.startsWith(`${ledgerId}::`)) {
          await state.loadMonth(ledgerId, monthOfKey(key));
        }
      }
      for (const [key, bucket] of Object.entries(state.periodBuckets)) {
        if (!key.startsWith(`${ledgerId}${PERIOD_MARKER}`)) continue;
        await state.loadPeriod(ledgerId, periodKeyOfBucket(key), bucket.start, bucket.end);
      }
    },

    remove: async (id, ledgerId) => {
      await transactionService.remove(id);
      patchLedgerBuckets(ledgerId, (list) => list.filter((t) => t.id !== id));
      persistSnapshot();
    },

    upsertLocal: (ledgerId, tx) => {
      patchLedgerBuckets(ledgerId, (list) => {
        const without = list.filter((t) => t.id !== tx.id);
        return sortByTimeDesc(without);
      });
      // 仅在流水所属月份桶已加载时插入
      const buckets = { ...get().buckets };
      for (const key of Object.keys(buckets)) {
        if (!key.startsWith(`${ledgerId}::`)) continue;
        if (!bucketIncludesTransaction(key, tx)) continue;
        buckets[key] = {
          ...buckets[key],
          transactions: sortByTimeDesc([tx, ...buckets[key].transactions.filter((t) => t.id !== tx.id)]),
        };
      }
      const periodBuckets = { ...get().periodBuckets };
      for (const key of Object.keys(periodBuckets)) {
        if (!key.startsWith(`${ledgerId}${PERIOD_MARKER}`)) continue;
        const bucket = periodBuckets[key];
        const time = new Date(tx.occurredAt).getTime();
        if (time < new Date(bucket.start).getTime() || time >= new Date(bucket.end).getTime()) {
          continue;
        }
        periodBuckets[key] = {
          ...bucket,
          transactions: sortByTimeDesc([
            tx,
            ...bucket.transactions.filter((t) => t.id !== tx.id),
          ]),
        };
      }
      set({ buckets, periodBuckets });
      persistSnapshot();
    },

    deleteLocal: (ledgerId, id) => {
      patchLedgerBuckets(ledgerId, (list) => list.filter((t) => t.id !== id));
      persistSnapshot();
    },

    subscribe: (ledgerId) =>
      subscribeTransactions(ledgerId, {
        onUpsert: (tx) => get().upsertLocal(ledgerId, tx),
        onDelete: (id) => get().deleteLocal(ledgerId, id),
      }),

    reset: () => {
      const { ownerId } = get();
      if (ownerId) void removeSnapshot(transactionSnapshotKey(ownerId));
      set({ ownerId: null, buckets: {}, periodBuckets: {} });
    },
  };
});

export const selectPeriodBucket = (
  state: TransactionState,
  ledgerId: string | null | undefined,
  periodKey: string,
): PeriodBucket | undefined =>
  ledgerId ? state.periodBuckets[periodBucketKey(ledgerId, periodKey)] : undefined;

/** 某账本某时间区间的流水；未加载时返回稳定的空数组 */
export const selectPeriodTransactions = (
  state: TransactionState,
  ledgerId: string | null | undefined,
  periodKey: string,
): Transaction[] =>
  selectPeriodBucket(state, ledgerId, periodKey)?.transactions ?? EMPTY_TRANSACTIONS;

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
  for (const bucket of Object.values(state.periodBuckets)) {
    const found = bucket.transactions.find((tx) => tx.id === id);
    if (found) return found;
  }
  return undefined;
};
