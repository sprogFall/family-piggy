import {
  deviceTimeZone,
  formatRecurringSchedule,
  isSameRecurringSchedule,
  nextRunDate,
  validateRecurringSchedule,
} from './recurring';

describe('nextRunDate', () => {
  it('每月 10 号：本月未到则本月，已到/当天则下月', () => {
    expect(nextRunDate({ frequency: 'monthly', monthlyDay: 10 }, new Date(2024, 4, 1))).toBe(
      '2024-05-10',
    );
    expect(nextRunDate({ frequency: 'monthly', monthlyDay: 10 }, new Date(2024, 4, 10))).toBe(
      '2024-06-10',
    );
    expect(nextRunDate({ frequency: 'monthly', monthlyDay: 10 }, new Date(2024, 4, 20))).toBe(
      '2024-06-10',
    );
  });

  it('每月 31 号在短月收敛到当月最后一天', () => {
    expect(nextRunDate({ frequency: 'monthly', monthlyDay: 31 }, new Date(2024, 0, 1))).toBe(
      '2024-01-31',
    );
    expect(nextRunDate({ frequency: 'monthly', monthlyDay: 31 }, new Date(2024, 0, 31))).toBe(
      '2024-02-29',
    );
    expect(nextRunDate({ frequency: 'monthly', monthlyDay: 31 }, new Date(2024, 1, 29))).toBe(
      '2024-03-31',
    );
  });

  it('跨年计算', () => {
    expect(nextRunDate({ frequency: 'monthly', monthlyDay: 5 }, new Date(2024, 11, 10))).toBe(
      '2025-01-05',
    );
  });

  it('每周：取本周还未到的周几；当天则顺延下一周', () => {
    // 2024-05-20 是周一
    expect(nextRunDate({ frequency: 'weekly', weeklyDay: 3 }, new Date(2024, 4, 20))).toBe(
      '2024-05-22',
    );
    expect(nextRunDate({ frequency: 'weekly', weeklyDay: 1 }, new Date(2024, 4, 20))).toBe(
      '2024-05-27',
    );
    expect(nextRunDate({ frequency: 'weekly', weeklyDay: 0 }, new Date(2024, 4, 20))).toBe(
      '2024-05-26',
    );
  });
});

describe('formatRecurringSchedule', () => {
  it('输出每月/每周文案', () => {
    expect(formatRecurringSchedule({ frequency: 'monthly', monthlyDay: 10 })).toBe('每月10号');
    expect(formatRecurringSchedule({ frequency: 'weekly', weeklyDay: 1 })).toBe('每周一');
    expect(formatRecurringSchedule({ frequency: 'weekly', weeklyDay: 0 })).toBe('每周日');
  });
});

describe('validateRecurringSchedule', () => {
  it('拒绝空计划与非法日期', () => {
    expect(validateRecurringSchedule(null)).toBe('请选择定时时间');
    expect(validateRecurringSchedule({ frequency: 'monthly', monthlyDay: 0 })).toBe(
      '每月日期需在 1 到 31 号之间',
    );
    expect(validateRecurringSchedule({ frequency: 'weekly', weeklyDay: 7 })).toBe(
      '每周日期不正确',
    );
  });

  it('合法计划返回 null', () => {
    expect(validateRecurringSchedule({ frequency: 'monthly', monthlyDay: 31 })).toBeNull();
    expect(validateRecurringSchedule({ frequency: 'weekly', weeklyDay: 0 })).toBeNull();
  });
});

describe('isSameRecurringSchedule', () => {
  it('同频率且同日期视为相同', () => {
    expect(
      isSameRecurringSchedule(
        { frequency: 'monthly', monthlyDay: 10 },
        { frequency: 'monthly', monthlyDay: 10 },
      ),
    ).toBe(true);
    expect(
      isSameRecurringSchedule(
        { frequency: 'weekly', weeklyDay: 1 },
        { frequency: 'monthly', monthlyDay: 1 },
      ),
    ).toBe(false);
  });
});

describe('deviceTimeZone', () => {
  it('始终返回非空字符串', () => {
    expect(deviceTimeZone().length).toBeGreaterThan(0);
  });
});
