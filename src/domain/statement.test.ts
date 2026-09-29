import type { Transaction } from '@/types/domain';

import { dominantCurrency } from './currency';
import {
  breakdown,
  breakdownWithOther,
  groupByDay,
  monthSummary,
  monthlySummaryPoints,
  scopeToCurrency,
  trendByDay,
} from './statement';

const tx = (partial: Partial<Transaction> & { id: string }): Transaction => ({
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 100,
  currency: 'CNY',
  tagIds: [],
  note: '',
  attributes: { reimbursement: false },
  images: [],
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

  it('不跨币种相加：默认只汇总主币种', () => {
    const list = [
      tx({ id: '1', amount: 1000 }),
      tx({ id: '2', amount: 200 }),
      tx({ id: '3', amount: 9999, currency: 'USD', kind: 'income' }),
    ];
    expect(monthSummary(list)).toEqual({ expense: 1200, income: 0, balance: -1200 });
    expect(monthSummary(list, 'USD')).toEqual({ expense: 0, income: 9999, balance: 9999 });
  });
});

describe('scopeToCurrency', () => {
  it('按币种过滤，不传时取主币种', () => {
    const list = [tx({ id: '1' }), tx({ id: '2', currency: 'EUR' })];
    expect(scopeToCurrency(list, 'EUR').map((item) => item.id)).toEqual(['2']);
    expect(scopeToCurrency(list).map((item) => item.id)).toEqual(['1']);
    expect(dominantCurrency(list)).toBe('CNY');
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
    expect(groups[0].currency).toBe('CNY');
  });

  it('组内汇总只统计当天主币种，明细仍保留全部流水', () => {
    const groups = groupByDay([
      tx({ id: '1', occurredAt: new Date(2024, 4, 20, 8).toISOString(), amount: 100 }),
      tx({
        id: '2',
        occurredAt: new Date(2024, 4, 20, 9).toISOString(),
        amount: 9999,
        currency: 'USD',
      }),
      tx({ id: '3', occurredAt: new Date(2024, 4, 20, 10).toISOString(), amount: 50, currency: 'USD' }),
    ]);

    expect(groups[0].currency).toBe('USD');
    expect(groups[0].transactions).toHaveLength(3);
    expect(groups[0].expense).toBe(10049);
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

  it('只统计指定币种，不把不同币种加在一起', () => {
    const list = [
      tx({ id: '1', occurredAt: new Date(2024, 4, 2, 8).toISOString(), amount: 100 }),
      tx({
        id: '2',
        occurredAt: new Date(2024, 4, 2, 9).toISOString(),
        amount: 500,
        currency: 'USD',
      }),
    ];
    const month = { year: 2024, month: 5 };

    expect(trendByDay(list, month, 'CNY')[1]).toEqual({ day: 2, expense: 100, income: 0 });
    expect(trendByDay(list, month, 'USD')[1]).toEqual({ day: 2, expense: 500, income: 0 });
  });
});

describe('monthlySummaryPoints', () => {
  it('按 12 个月汇总，缺失月补 0', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        ledgerId: 'l1',
        categoryId: 'c1',
        kind: 'expense',
        amount: 100,
        currency: 'CNY',
        tagIds: [],
        note: '',
        attributes: { reimbursement: false },
        images: [],
        occurredAt: new Date(2024, 0, 15).toISOString(),
        createdBy: 'u1',
      },
      {
        id: 't2',
        ledgerId: 'l1',
        categoryId: 'c1',
        kind: 'income',
        amount: 300,
        currency: 'CNY',
        tagIds: [],
        note: '',
        attributes: { reimbursement: false },
        images: [],
        occurredAt: new Date(2024, 1, 10).toISOString(),
        createdBy: 'u1',
      },
      {
        id: 't3',
        ledgerId: 'l1',
        categoryId: 'c1',
        kind: 'expense',
        amount: 50,
        currency: 'USD',
        tagIds: [],
        note: '',
        attributes: { reimbursement: false },
        images: [],
        occurredAt: new Date(2024, 0, 20).toISOString(),
        createdBy: 'u1',
      },
    ];
    const points = monthlySummaryPoints(transactions, 'CNY');
    expect(points).toHaveLength(12);
    expect(points[0]).toMatchObject({ month: 1, expense: 100, income: 0, balance: -100 });
    expect(points[1]).toMatchObject({ month: 2, expense: 0, income: 300, balance: 300 });
    expect(points[2]).toMatchObject({ month: 3, expense: 0, income: 0, balance: 0 });
  });
});
