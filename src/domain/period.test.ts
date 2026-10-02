import { dayKeyOf } from './dates';
import {
  periodDayCount,
  periodFromCustom,
  periodFromMonth,
  periodFromPreset,
  periodFromWeekStart,
  periodFromYear,
  recentWeekStarts,
  recentYears,
} from './period';

const NOW = new Date(2024, 4, 20, 12, 0, 0);

describe('periodFromPreset', () => {
  it('本月 / 上月', () => {
    expect(dayKeyOf(periodFromPreset('thisMonth', NOW).start)).toBe('2024-05-01');
    expect(dayKeyOf(periodFromPreset('thisMonth', NOW).end)).toBe('2024-06-01');
    expect(periodFromPreset('thisMonth', NOW).label).toBe('本月');

    expect(dayKeyOf(periodFromPreset('lastMonth', NOW).start)).toBe('2024-04-01');
    expect(dayKeyOf(periodFromPreset('lastMonth', NOW).end)).toBe('2024-05-01');
    expect(periodFromPreset('lastMonth', NOW).label).toBe('上月');
  });

  it('本周以周一为起点 / 上周', () => {
    expect(dayKeyOf(periodFromPreset('thisWeek', NOW).start)).toBe('2024-05-20');
    expect(dayKeyOf(periodFromPreset('thisWeek', NOW).end)).toBe('2024-05-27');
    expect(dayKeyOf(periodFromPreset('lastWeek', NOW).start)).toBe('2024-05-13');
    expect(dayKeyOf(periodFromPreset('lastWeek', NOW).end)).toBe('2024-05-20');
  });

  it('今年 / 去年 / 最近30天 / 全部时间', () => {
    expect(dayKeyOf(periodFromPreset('thisYear', NOW).start)).toBe('2024-01-01');
    expect(dayKeyOf(periodFromPreset('thisYear', NOW).end)).toBe('2025-01-01');
    expect(dayKeyOf(periodFromPreset('lastYear', NOW).start)).toBe('2023-01-01');
    expect(periodFromPreset('last30Days', NOW).start).toBe(
      new Date(2024, 3, 21, 0, 0, 0, 0).toISOString(),
    );
    expect(periodFromPreset('last30Days', NOW).end).toBe(
      new Date(2024, 4, 21, 0, 0, 0, 0).toISOString(),
    );
    expect(periodFromPreset('allTime', NOW).label).toBe('全部时间');
  });
});

describe('自定义周期', () => {
  it('指定周 / 月 / 年生成自然日边界与标签', () => {
    const week = periodFromWeekStart(new Date(2024, 4, 22));
    expect(dayKeyOf(week.start)).toBe('2024-05-20');
    expect(dayKeyOf(week.end)).toBe('2024-05-27');
    expect(week.label).toBe('5月20日 - 5月26日');

    const month = periodFromMonth({ year: 2024, month: 5 });
    expect(month.label).toBe('2024年5月');
    expect(dayKeyOf(month.start)).toBe('2024-05-01');

    const year = periodFromYear(2024);
    expect(year.label).toBe('2024年');
    expect(dayKeyOf(year.end)).toBe('2025-01-01');
  });

  it('自定义起止日期闭区间，起止反了自动交换', () => {
    const period = periodFromCustom(new Date(2024, 4, 20), new Date(2024, 4, 22));
    expect(dayKeyOf(period.start)).toBe('2024-05-20');
    expect(dayKeyOf(period.end)).toBe('2024-05-23');
    expect(period.label).toBe('5月20日 - 5月22日');

    const reversed = periodFromCustom(new Date(2024, 4, 22), new Date(2024, 4, 20));
    expect(dayKeyOf(reversed.start)).toBe('2024-05-20');
    expect(dayKeyOf(reversed.end)).toBe('2024-05-23');
  });

  it('recentWeekStarts / recentYears 最新在前', () => {
    expect(recentWeekStarts(2, NOW).map((date) => dayKeyOf(date.toISOString()))).toEqual([
      '2024-05-20',
      '2024-05-13',
    ]);
    expect(recentYears(3, NOW)).toEqual([2024, 2023, 2022]);
  });

  it('periodDayCount 至少为 1', () => {
    expect(periodDayCount(periodFromMonth({ year: 2024, month: 2 }))).toBe(29);
    expect(periodDayCount({ start: NOW.toISOString(), end: NOW.toISOString() })).toBe(1);
  });
});
