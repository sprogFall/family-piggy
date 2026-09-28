import {
  addMonths,
  currentMonth,
  entryDateLabel,
  dayKeyOf,
  dayLabelOf,
  daysInMonth,
  monthKey,
  monthLabel,
  monthRangeISO,
  parseDateTimeCN,
  recentMonths,
  timeLabelOf,
} from './dates';

describe('month 计算', () => {
  it('addMonths 跨年', () => {
    expect(addMonths({ year: 2024, month: 1 }, -1)).toEqual({ year: 2023, month: 12 });
    expect(addMonths({ year: 2024, month: 11 }, 2)).toEqual({ year: 2025, month: 1 });
  });

  it('monthKey / monthLabel', () => {
    expect(monthKey({ year: 2024, month: 5 })).toBe('2024-05');
    expect(monthLabel({ year: 2024, month: 5 })).toBe('2024年5月');
  });

  it('daysInMonth 处理闰年', () => {
    expect(daysInMonth({ year: 2024, month: 2 })).toBe(29);
    expect(daysInMonth({ year: 2023, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2024, month: 12 })).toBe(31);
  });

  it('monthRangeISO 覆盖整月', () => {
    const { start, end } = monthRangeISO({ year: 2024, month: 5 });
    expect(dayKeyOf(start)).toBe('2024-05-01');
    expect(dayKeyOf(end)).toBe('2024-06-01');
  });

  it('recentMonths 倒序', () => {
    expect(recentMonths(3, { year: 2024, month: 5 })).toEqual([
      { year: 2024, month: 5 },
      { year: 2024, month: 4 },
      { year: 2024, month: 3 },
    ]);
  });

  it('currentMonth 返回本地当前月', () => {
    const now = new Date();
    expect(currentMonth()).toEqual({ year: now.getFullYear(), month: now.getMonth() + 1 });
  });
});

describe('entryDateLabel（记账页顶部日期）', () => {
  const now = new Date(2024, 4, 20, 21, 25);

  it('今天展示「今天 HH:mm」', () => {
    expect(entryDateLabel(new Date(2024, 4, 20, 9, 5).toISOString(), now)).toBe('今天 09:05');
  });

  it('同年其它日期省略年份', () => {
    expect(entryDateLabel(new Date(2024, 4, 3, 12, 0).toISOString(), now)).toBe('5月3日');
    expect(entryDateLabel(new Date(2024, 0, 1, 12, 0).toISOString(), now)).toBe('1月1日');
  });

  it('跨年日期展示完整年月日', () => {
    expect(entryDateLabel(new Date(2023, 11, 31, 23, 0).toISOString(), now)).toBe('2023年12月31日');
  });
});

describe('标签', () => {
  const iso = new Date(2024, 4, 20, 14, 30).toISOString();

  it('dayKeyOf', () => {
    expect(dayKeyOf(iso)).toBe('2024-05-20');
  });

  it('dayLabelOf 含星期', () => {
    expect(dayLabelOf(iso)).toBe('5月20日 星期一');
  });

  it('timeLabelOf', () => {
    expect(timeLabelOf(iso)).toBe('14:30');
  });
});

describe('parseDateTimeCN', () => {
  it('解析 yyyy-MM-dd HH:mm', () => {
    const d = parseDateTimeCN('2024-05-20 14:30');
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(20);
    expect(d?.getHours()).toBe(14);
  });

  it('解析纯日期', () => {
    expect(parseDateTimeCN('2024-5-2')?.getDate()).toBe(2);
  });

  it('非法输入返回 null', () => {
    expect(parseDateTimeCN('abc')).toBeNull();
    expect(parseDateTimeCN('2024-13-01')).not.toBeNull();
  });
});
