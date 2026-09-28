import type { Transaction } from '@/types/domain';

import { breakdown, breakdownWithOther, groupByDay, monthSummary, trendByDay } from './statement';

const tx = (partial: Partial<Transaction> & { id: string }): Transaction => ({
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 100,
  tagId: null,
  occurredAt: new Date(2024, 4, 20, 12, 0).toISOString(),
  createdBy: 'u1',
  ...partial,
});

const names: Record<string, string> = {
  c1: '餐饮',
  c2: '交通',
  c3: '购物',
  c4: '居住',
  c5: '娱乐',
  c6: '医疗',
};

const categoryNameOf = (id: string) => names[id] ?? '未知';

describe('monthSummary', () => {
  it('汇总支出收入与结余', () => {
    const summary = monthSummary([
      tx({ id: '1', kind: 'expense', amount: 2368 }),
      tx({ id: '2', kind: 'income', amount: 380000 }),
      tx({ id: '3', kind: 'expense', amount: 232 }),
    ]);
    expect(summary).toEqual({ expense: 2600, income: 380000, balance: 377400 });
  });

  it('空数据', () => {
    expect(monthSummary([])).toEqual({ expense: 0, income: 0, balance: 0 });
  });
});

describe('groupByDay', () => {
  it('按天分组且最新在前，组内含小计', () => {
    const groups = groupByDay([
      tx({ id: '1', occurredAt: new Date(2024, 4, 20, 8).toISOString(), amount: 100 }),
      tx({ id: '2', occurredAt: new Date(2024, 4, 20, 9).toISOString(), amount: 200 }),
      tx({ id: '3', occurredAt: new Date(2024, 4, 19, 9).toISOString(), amount: 500 }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['2024-05-20', '2024-05-19']);
    expect(groups[0].transactions).toHaveLength(2);
    expect(groups[0].expense).toBe(300);
    expect(groups[1].expense).toBe(500);
    expect(groups[0].label).toBe('5月20日 星期一');
  });

  it('空数据返回空数组', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('breakdown', () => {
  const list = [
    tx({ id: '1', categoryId: 'c1', amount: 3500 }),
    tx({ id: '2', categoryId: 'c2', amount: 2000 }),
    tx({ id: '3', categoryId: 'c1', amount: 1500 }),
    tx({ id: '4', kind: 'income', amount: 9999 }),
  ];

  it('按分类降序并计算占比，只统计指定类型', () => {
    const items = breakdown(list, 'expense', categoryNameOf);
    expect(items).toEqual([
      { categoryId: 'c1', name: '餐饮', amount: 5000, ratio: 5000 / 7000 },
      { categoryId: 'c2', name: '交通', amount: 2000, ratio: 2000 / 7000 },
    ]);
  });

  it('无数据时 ratio 为 0', () => {
    expect(breakdown([], 'expense', categoryNameOf)).toEqual([]);
  });
});

describe('breakdownWithOther', () => {
  const list = [
    tx({ id: '1', categoryId: 'c1', amount: 3500 }),
    tx({ id: '2', categoryId: 'c2', amount: 2000 }),
    tx({ id: '3', categoryId: 'c3', amount: 800 }),
    tx({ id: '4', categoryId: 'c4', amount: 600 }),
    tx({ id: '5', categoryId: 'c5', amount: 400 }),
    tx({ id: '6', categoryId: 'c6', amount: 200 }),
  ];

  it('Top N 之外合并为其他', () => {
    const items = breakdownWithOther(list, 'expense', categoryNameOf, 5);
    expect(items).toHaveLength(6);
    expect(items[5]).toEqual({ categoryId: 'other', name: '其他', amount: 200, ratio: 200 / 7500 });
  });

  it('不超过 Top N 时不合并', () => {
    expect(breakdownWithOther(list.slice(0, 3), 'expense', categoryNameOf, 5)).toHaveLength(3);
  });
});

describe('trendByDay', () => {
  it('整月每天一个点，缺失天为 0', () => {
    const points = trendByDay(
      [tx({ id: '1', occurredAt: new Date(2024, 4, 2, 8).toISOString(), amount: 100 })],
      { year: 2024, month: 5 },
    );
    expect(points).toHaveLength(31);
    expect(points[0]).toEqual({ day: 1, expense: 0, income: 0 });
    expect(points[1]).toEqual({ day: 2, expense: 100, income: 0 });
  });
});
