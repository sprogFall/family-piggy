/**
 * 定时记账的纯规则：根据「每月几号 / 每周周几」计算下一次生成日期。
 * 日期全部按本地日历处理，输出 yyyy-MM-dd，避免 toISOString 的 UTC 偏移。
 */

import type { RecurringRule, RecurringSchedule } from '@/types/domain';

/** 周日到周六，对应 JS Date.getDay() 与数据库 weekly_day */
export const RECURRING_WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const;

export const MONTHLY_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1);

const pad2 = (value: number): string => String(value).padStart(2, '0');

const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const localDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** 构造某年某月（1-12）的日期；日期超出当月天数时收敛到当月最后一天 */
const monthlyDate = (year: number, month: number, day: number): Date => {
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
};

/** 判断两个定时计划是否相同 */
export const isSameRecurringSchedule = (
  a: RecurringSchedule | null | undefined,
  b: RecurringSchedule | null | undefined,
): boolean => {
  if (!a || !b || a.frequency !== b.frequency) return false;
  if (a.frequency === 'monthly' && b.frequency === 'monthly') {
    return a.monthlyDay === b.monthlyDay;
  }
  if (a.frequency === 'weekly' && b.frequency === 'weekly') {
    return a.weeklyDay === b.weeklyDay;
  }
  return false;
};

/**
 * 下一次生成日期：严格晚于 from 所在自然日。
 * 若今天正好是选中日期，则顺延到下一周期，避免创建后立刻生成一笔。
 */
export const nextRunDate = (schedule: RecurringSchedule, from: Date = new Date()): string => {
  const today = startOfLocalDay(from);

  if (schedule.frequency === 'monthly') {
    let candidate = monthlyDate(today.getFullYear(), today.getMonth() + 1, schedule.monthlyDay);
    if (candidate.getTime() <= today.getTime()) {
      candidate = monthlyDate(today.getFullYear(), today.getMonth() + 2, schedule.monthlyDay);
    }
    return localDateKey(candidate);
  }

  const delta = (schedule.weeklyDay - today.getDay() + 7) % 7;
  const offset = delta === 0 ? 7 : delta;
  const candidate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  return localDateKey(candidate);
};

/** 定时计划的可读文案，如「每月10号」「每周一」 */
export const formatRecurringSchedule = (schedule: RecurringSchedule): string => {
  if (schedule.frequency === 'monthly') return `每月${schedule.monthlyDay}号`;
  return `每周${RECURRING_WEEKDAY_LABELS[schedule.weeklyDay]}`;
};

/** 校验定时计划，返回中文错误文案；合法返回 null */
export const validateRecurringSchedule = (schedule: RecurringSchedule | null): string | null => {
  if (!schedule) return '请选择定时时间';
  if (schedule.frequency === 'monthly') {
    if (
      !Number.isInteger(schedule.monthlyDay) ||
      schedule.monthlyDay < 1 ||
      schedule.monthlyDay > 31
    ) {
      return '每月日期需在 1 到 31 号之间';
    }
    return null;
  }
  if (!Number.isInteger(schedule.weeklyDay) || schedule.weeklyDay < 0 || schedule.weeklyDay > 6) {
    return '每周日期不正确';
  }
  return null;
};

/** 从规则中提取定时计划，供编辑页回填 */
export const scheduleOfRule = (rule: RecurringRule): RecurringSchedule => rule.schedule;

/** 设备 IANA 时区；取不到时回落到 Asia/Shanghai */
export const deviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  } catch {
    return 'Asia/Shanghai';
  }
};
