/**
 * 日期工具：全部基于本地时区，纯函数。
 */

export interface MonthRef {
  /** 1-12 */
  year: number;
  month: number;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const makeMonth = (year: number, month: number): MonthRef => ({ year, month });

export const addMonths = ({ year, month }: MonthRef, delta: number): MonthRef => {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
};

/** 归一化 key，如 2024-05 */
export const monthKey = ({ year, month }: MonthRef): string =>
  `${year}-${pad2(month)}`;

export const monthLabel = ({ year, month }: MonthRef): string =>
  `${year}年${month}月`;

export const currentMonth = (): MonthRef => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

export const daysInMonth = ({ year, month }: MonthRef): number =>
  new Date(year, month, 0).getDate();

/** 本月起止（含头不含尾），ISO 字符串，用于数据库范围查询 */
export const monthRangeISO = ({ year, month }: MonthRef): { start: string; end: string } => ({
  start: new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString(),
  end: new Date(year, month, 1, 0, 0, 0, 0).toISOString(),
});

/** 以 from 为最新一个月，倒序返回 count 个月 */
export const recentMonths = (count: number, from: MonthRef): MonthRef[] =>
  Array.from({ length: count }, (_, i) => addMonths(from, -i));

/** ISO -> 本地 "yyyy-MM-dd"（按天分组用） */
export const dayKeyOf = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/** ISO -> "5月20日 星期二" */
export const dayLabelOf = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`;
};

/** ISO -> "14:30" */
export const timeLabelOf = (iso: string): string => {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/**
 * 记账页顶部的日期文案：
 * - 今天 -> "今天 21:25"（带时间，方便确认刚发生的时间）
 * - 今年其它日期 -> "8月3日"（省略年份，提高显示效率）
 * - 跨年日期 -> "2024年8月3日"
 */
export const entryDateLabel = (iso: string, now: Date = new Date()): string => {
  const d = new Date(iso);
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  ) {
    return `今天 ${timeLabelOf(iso)}`;
  }
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

/** 解析 "yyyy-MM-dd HH:mm"（本地时区），失败返回 null */
export const parseDateTimeCN = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2})?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0'] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  return Number.isNaN(date.getTime()) ? null : date;
};
