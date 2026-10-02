/**
 * 账单统计的纯计算：汇总 / 按天分组 / 分类占比 / 每日趋势。
 */

import type { Transaction, TxKind } from '@/types/domain';

import { dominantCurrency, type CurrencyCode } from './currency';
import { dayKeyOf, dayLabelOf, daysInMonth, type MonthRef } from './dates';

export interface Summary {
  expense: number;
  income: number;
  balance: number;
}

/**
 * 取某币种的流水子集（不同币种的最小单位不可直接相加）。
 * 不传币种时取该批流水的主币种（出现次数最多，次数相同取最近一笔）。
 */
export const scopeToCurrency = (
  transactions: Transaction[],
  currency: CurrencyCode = dominantCurrency(transactions),
): Transaction[] => transactions.filter((tx) => tx.currency === currency);

export const monthSummary = (
  transactions: Transaction[],
  currency: CurrencyCode = dominantCurrency(transactions),
): Summary => {
  let expense = 0;
  let income = 0;
  for (const tx of transactions) {
    if (tx.currency !== currency) continue;
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
  /** 当日汇总币种（当天出现次数最多的币种），组内金额只统计该币种 */
  currency: CurrencyCode;
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
        currency: tx.currency,
        expense: 0,
        income: 0,
      };
      map.set(key, group);
    }
    group.transactions.push(tx);
    if (tx.occurredAt > group.occurredAt) group.occurredAt = tx.occurredAt;
  }
  for (const group of map.values()) {
    group.currency = dominantCurrency(group.transactions);
    // 不跨币种相加：当日汇总只统计主币种，其余币种仍按各自符号展示在明细行
    for (const tx of group.transactions) {
      if (tx.currency !== group.currency) continue;
      if (tx.kind === 'expense') group.expense += tx.amount;
      else group.income += tx.amount;
    }
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


export interface MonthlySummaryPoint {
  /** 1-12 */
  month: number;
  expense: number;
  income: number;
  balance: number;
}

/** 某年 12 个月的收支汇总（缺失月补 0），默认只统计主币种 */
export const monthlySummaryPoints = (
  transactions: Transaction[],
  currency: CurrencyCode = dominantCurrency(transactions),
): MonthlySummaryPoint[] => {
  const points: MonthlySummaryPoint[] = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    expense: 0,
    income: 0,
    balance: 0,
  }));
  for (const tx of transactions) {
    if (tx.currency !== currency) continue;
    const point = points[new Date(tx.occurredAt).getMonth()];
    if (!point) continue;
    if (tx.kind === 'expense') point.expense += tx.amount;
    else point.income += tx.amount;
  }
  for (const point of points) point.balance = point.income - point.expense;
  return points;
};

export interface TrendPoint {
  day: number;
  expense: number;
  income: number;
}

/** 整月每日收支（缺失天补 0）；默认只统计主币种，避免跨币种相加 */
export const trendByDay = (
  transactions: Transaction[],
  month: MonthRef,
  currency: CurrencyCode = dominantCurrency(transactions),
): TrendPoint[] => {
  const points: TrendPoint[] = Array.from({ length: daysInMonth(month) }, (_, i) => ({
    day: i + 1,
    expense: 0,
    income: 0,
  }));
  for (const tx of transactions) {
    if (tx.currency !== currency) continue;
    const day = new Date(tx.occurredAt).getDate();
    const point = points[day - 1];
    if (!point) continue;
    if (tx.kind === 'expense') point.expense += tx.amount;
    else point.income += tx.amount;
  }
  return points;
};

export type DistributionMode = TxKind | 'all';

export interface DistributionItem {
  categoryId: string;
  name: string;
  amount: number;
  /** 该分类下的流水笔数 */
  count: number;
  /** 总额占比 0~1 */
  ratio: number;
}

/** 按分类统计金额、笔数与占比；mode 为 all 时合并收支两侧 */
export const distribution = (
  transactions: Transaction[],
  mode: DistributionMode,
  categoryNameOf: (categoryId: string) => string,
): DistributionItem[] => {
  const map = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const tx of transactions) {
    if (mode !== 'all' && tx.kind !== mode) continue;
    const current = map.get(tx.categoryId) ?? { amount: 0, count: 0 };
    current.amount += tx.amount;
    current.count += 1;
    map.set(tx.categoryId, current);
    total += tx.amount;
  }
  return [...map.entries()]
    .map(([categoryId, value]) => ({
      categoryId,
      name: categoryNameOf(categoryId),
      amount: value.amount,
      count: value.count,
      ratio: total > 0 ? value.amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

/** Top N + 其余合并为「其他」，合并时保留笔数 */
export const distributionWithOther = (
  transactions: Transaction[],
  mode: DistributionMode,
  categoryNameOf: (categoryId: string) => string,
  topN = 8,
): DistributionItem[] => {
  const items = distribution(transactions, mode, categoryNameOf);
  if (items.length <= topN) return items;
  const otherAmount = items.slice(topN).reduce((sum, item) => sum + item.amount, 0);
  const otherCount = items.slice(topN).reduce((sum, item) => sum + item.count, 0);
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return [
    ...items.slice(0, topN),
    {
      categoryId: 'other',
      name: '其他',
      amount: otherAmount,
      count: otherCount,
      ratio: total > 0 ? otherAmount / total : 0,
    },
  ];
};

export interface RangeTrendPoint {
  /** 日期或月份 key，供稳定 React key 使用 */
  key: string;
  /** 横轴文案，如 10月2日 / 2026年10月 */
  label: string;
  expense: number;
  income: number;
  balance: number;
}

const localDayStart = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const localAddDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0);

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_DAYS_THRESHOLD = 62;

/**
 * 任意时间区间的收支趋势：
 * - 区间 <= 62 天按自然日聚合；
 * - 更长区间按自然月聚合，避免一年以上出现数百个点。
 * 默认只统计主币种。
 */
export const trendInRange = (
  transactions: Transaction[],
  startISO: string,
  endISO: string,
  currency: CurrencyCode = dominantCurrency(transactions),
): RangeTrendPoint[] => {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (!(start.getTime() < end.getTime())) return [];
  const totalDays = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  const useMonth = totalDays > MONTH_DAYS_THRESHOLD;

  const points: RangeTrendPoint[] = [];
  const indexByKey = new Map<string, number>();
  if (useMonth) {
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor.getTime() < end.getTime()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      indexByKey.set(key, points.length);
      points.push({
        key,
        label: `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`,
        expense: 0,
        income: 0,
        balance: 0,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  } else {
    for (let cursor = localDayStart(start); cursor.getTime() < end.getTime(); cursor = localAddDays(cursor, 1)) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      indexByKey.set(key, points.length);
      points.push({
        key,
        label: `${cursor.getMonth() + 1}月${cursor.getDate()}日`,
        expense: 0,
        income: 0,
        balance: 0,
      });
    }
  }

  for (const tx of transactions) {
    if (tx.currency !== currency) continue;
    const date = new Date(tx.occurredAt);
    if (date.getTime() < start.getTime() || date.getTime() >= end.getTime()) continue;
    const key = useMonth
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const index = indexByKey.get(key);
    if (index === undefined) continue;
    const point = points[index];
    if (!point) continue;
    if (tx.kind === 'expense') point.expense += tx.amount;
    else point.income += tx.amount;
  }

  for (const point of points) point.balance = point.income - point.expense;
  return points;
};
