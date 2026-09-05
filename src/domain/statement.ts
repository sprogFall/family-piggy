/**
 * 账单统计的纯计算：汇总 / 按天分组 / 分类占比 / 每日趋势。
 */

import type { Transaction, TxKind } from '@/types/domain';

import { dayKeyOf, dayLabelOf, daysInMonth, type MonthRef } from './dates';

export interface Summary {
  expense: number;
  income: number;
  balance: number;
}

export const monthSummary = (transactions: Transaction[]): Summary => {
  let expense = 0;
  let income = 0;
  for (const tx of transactions) {
    if (tx.kind === 'expense') expense += tx.amount;
    else income += tx.amount;
  }
  return { expense, income, balance: income - expense };
};

export interface DayGroup {
  key: string;
  label: string;
  /** 组内最新一条的时间，用于排序与展示 */
  occurredAt: string;
  transactions: Transaction[];
  expense: number;
  income: number;
}

/** 按天分组，最新日期在前 */
export const groupByDay = (transactions: Transaction[]): DayGroup[] => {
  const map = new Map<string, DayGroup>();
  for (const tx of transactions) {
    const key = dayKeyOf(tx.occurredAt);
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        label: dayLabelOf(tx.occurredAt),
        occurredAt: tx.occurredAt,
        transactions: [],
        expense: 0,
        income: 0,
      };
      map.set(key, group);
    }
    group.transactions.push(tx);
    if (tx.kind === 'expense') group.expense += tx.amount;
    else group.income += tx.amount;
    if (tx.occurredAt > group.occurredAt) group.occurredAt = tx.occurredAt;
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
};

export interface BreakdownItem {
  categoryId: string;
  name: string;
  amount: number;
  /** 占同类总额比例 0~1 */
  ratio: number;
}

/** 按分类汇总某类流水，降序 */
export const breakdown = (
  transactions: Transaction[],
  kind: TxKind,
  categoryNameOf: (categoryId: string) => string,
): BreakdownItem[] => {
  const sums = new Map<string, number>();
  let total = 0;
  for (const tx of transactions) {
    if (tx.kind !== kind) continue;
    sums.set(tx.categoryId, (sums.get(tx.categoryId) ?? 0) + tx.amount);
    total += tx.amount;
  }
  return [...sums.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryNameOf(categoryId),
      amount,
      ratio: total > 0 ? amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

/** Top N + 其余合并为“其他” */
export const breakdownWithOther = (
  transactions: Transaction[],
  kind: TxKind,
  categoryNameOf: (categoryId: string) => string,
  topN = 5,
): BreakdownItem[] => {
  const items = breakdown(transactions, kind, categoryNameOf);
  if (items.length <= topN) return items;
  const otherAmount = items
    .slice(topN)
    .reduce((sum, item) => sum + item.amount, 0);
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return [
    ...items.slice(0, topN),
    {
      categoryId: 'other',
      name: '其他',
      amount: otherAmount,
      ratio: total > 0 ? otherAmount / total : 0,
    },
  ];
};

export interface TrendPoint {
  day: number;
  expense: number;
  income: number;
}

/** 整月每日收支（缺失天补 0） */
export const trendByDay = (
  transactions: Transaction[],
  month: MonthRef,
): TrendPoint[] => {
  const points: TrendPoint[] = Array.from({ length: daysInMonth(month) }, (_, i) => ({
    day: i + 1,
    expense: 0,
    income: 0,
  }));
  for (const tx of transactions) {
    const day = new Date(tx.occurredAt).getDate();
    const point = points[day - 1];
    if (!point) continue;
    if (tx.kind === 'expense') point.expense += tx.amount;
    else point.income += tx.amount;
  }
  return points;
};
