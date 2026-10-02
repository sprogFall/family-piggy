/**
 * 统计时间周期：把「本月 / 本周 / 年 / 自定义日期范围」统一成 [start, end) ISO 区间。
 *
 * 与 dates.ts 一样全部基于本地时区。DB 的 occurred_at 为 ISO 时间，周 / 月 / 年边界
 * 必须先落到本地自然日再转 ISO，避免 UTC 偏移把凌晨流水分到前一天。
 */

import { monthLabel, type MonthRef } from './dates';

const DAY_MS = 24 * 60 * 60 * 1000;
const pad2 = (value: number): string => String(value).padStart(2, '0');

export type PeriodPreset =
  | 'thisMonth'
  | 'lastMonth'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisYear'
  | 'lastYear'
  | 'last30Days'
  | 'allTime';

export interface PeriodRange {
  /** 稳定缓存键，同时包含起止时间，避免同 key 不同区间 */
  key: string;
  /** 筛选按钮上给用户看的中文名，如「本月」「2026年5月」 */
  label: string;
  /** 闭区间起点，ISO */
  start: string;
  /** 开区间终点，ISO */
  end: string;
}

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0);

const buildPeriod = (start: Date, endExclusive: Date, label: string): PeriodRange => {
  const startISO = start.toISOString();
  const endISO = endExclusive.toISOString();
  return { key: `${startISO}_${endISO}`, label, start: startISO, end: endISO };
};

const rangeLabel = (start: Date, endExclusive: Date): string => {
  const end = addDays(endExclusive, -1);
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  ) {
    return `${start.getMonth() + 1}月${start.getDate()}日`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
  }
  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;
};

/** 以周一为一周起点，返回本地自然日 00:00 */
export const weekStartOf = (date: Date): Date => {
  const day = date.getDay();
  const offset = (day + 6) % 7;
  return addDays(startOfDay(date), -offset);
};

export const periodFromPreset = (
  preset: PeriodPreset,
  now: Date = new Date(),
): PeriodRange => {
  const today = startOfDay(now);
  const year = now.getFullYear();
  const month = now.getMonth();
  switch (preset) {
    case 'thisMonth':
      return buildPeriod(new Date(year, month, 1), new Date(year, month + 1, 1), '本月');
    case 'lastMonth':
      return buildPeriod(new Date(year, month - 1, 1), new Date(year, month, 1), '上月');
    case 'thisWeek': {
      const start = weekStartOf(now);
      return buildPeriod(start, addDays(start, 7), '本周');
    }
    case 'lastWeek': {
      const start = addDays(weekStartOf(now), -7);
      return buildPeriod(start, addDays(start, 7), '上周');
    }
    case 'thisYear':
      return buildPeriod(new Date(year, 0, 1), new Date(year + 1, 0, 1), '今年');
    case 'lastYear':
      return buildPeriod(new Date(year - 1, 0, 1), new Date(year, 0, 1), '去年');
    case 'last30Days':
      return buildPeriod(addDays(today, -29), addDays(today, 1), '最近30天');
    case 'allTime':
      return buildPeriod(new Date(1970, 0, 1), addDays(today, 1), '全部时间');
  }
};

export const periodFromMonth = (month: MonthRef): PeriodRange =>
  buildPeriod(new Date(month.year, month.month - 1, 1), new Date(month.year, month.month, 1), monthLabel(month));

export const periodFromYear = (year: number): PeriodRange =>
  buildPeriod(new Date(year, 0, 1), new Date(year + 1, 0, 1), `${year}年`);

export const periodFromWeekStart = (weekStart: Date): PeriodRange => {
  const start = weekStartOf(weekStart);
  const end = addDays(start, 7);
  return buildPeriod(start, end, rangeLabel(start, end));
};

/** 自定义开始 / 结束日期都按本地自然日闭区间处理 */
export const periodFromCustom = (startDate: Date, endDate: Date): PeriodRange => {
  const first = startOfDay(startDate);
  const last = startOfDay(endDate);
  const start = first <= last ? first : last;
  const end = addDays(first <= last ? last : first, 1);
  return buildPeriod(start, end, rangeLabel(start, end));
};

/** 最近 N 个周一起点，最新一周在前 */
export const recentWeekStarts = (count: number, from: Date = new Date()): Date[] => {
  const current = weekStartOf(from);
  return Array.from({ length: count }, (_, index) => addDays(current, -index * 7));
};

/** 最近 N 个年份，最新一年在前 */
export const recentYears = (count: number, from: Date = new Date()): number[] => {
  const year = from.getFullYear();
  return Array.from({ length: count }, (_, index) => year - index);
};

/** 周期长度（自然日），用于选择趋势聚合粒度 */
export const periodDayCount = (period: Pick<PeriodRange, 'start' | 'end'>): number =>
  Math.max(1, Math.round((new Date(period.end).getTime() - new Date(period.start).getTime()) / DAY_MS));

export const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
