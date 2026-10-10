import { recentMonthBuckets } from './snapshot';

describe('recentMonthBuckets', () => {
  const buckets = {
    'l1::2024-01': 1,
    'l1::2024-03': 3,
    'l1::2024-02': 2,
    'l2::2024-05': 5,
  };

  it('每个账本只保留最近 N 个月，按月份倒序保留', () => {
    expect(recentMonthBuckets(buckets, 2)).toEqual({
      'l1::2024-03': 3,
      'l1::2024-02': 2,
      'l2::2024-05': 5,
    });
  });

  it('不超过上限时原样返回', () => {
    expect(recentMonthBuckets(buckets, 10)).toEqual(buckets);
  });

  it('上限为 0 时不保留任何桶', () => {
    expect(recentMonthBuckets(buckets, 0)).toEqual({});
  });

  it('空输入返回空对象', () => {
    expect(recentMonthBuckets({}, 3)).toEqual({});
  });

  it('跨年按字典序比较仍然正确', () => {
    expect(
      recentMonthBuckets({ 'l1::2024-12': 1, 'l1::2025-01': 2, 'l1::2024-11': 3 }, 1),
    ).toEqual({ 'l1::2025-01': 2 });
  });
});
