import type { Transaction } from '@/types/domain';

import {
  TRANSACTION_TYPE_FILTER_OPTIONS,
  filterTransactions,
  transactionMatchesTypeFilter,
} from './transaction-filter';

const tx = (
  id: string,
  partial: Partial<Transaction> = {},
): Transaction => ({
  id,
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 100,
  currency: 'CNY',
  tagNames: [],
  note: '',
  attributes: { reimbursement: false },
  images: [],
  occurredAt: '2024-05-20T04:00:00.000Z',
  createdBy: 'u1',
  ...partial,
});

const categoryNameOf = (id: string): string =>
  id === 'c1' ? '餐饮' : id === 'c2' ? '交通' : '未知分类';
describe('transaction-filter', () => {
  it('提供全部 / 报销两个选项，不再包含未报销', () => {
    expect(TRANSACTION_TYPE_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      'all',
      'reimbursement',
    ]);
  });

  it('按是否报销筛选', () => {
    const list = [tx('t1', { attributes: { reimbursement: true } }), tx('t2')];
    expect(transactionMatchesTypeFilter(list[0], 'reimbursement')).toBe(true);
    expect(transactionMatchesTypeFilter(list[1], 'reimbursement')).toBe(false);
  });

  it('支持收入 / 支出筛选', () => {
    const list = [tx('t1'), tx('t2', { kind: 'income' })];
    const filtered = filterTransactions(
      list,
      { type: 'all', kind: 'income', createdBy: 'all', keyword: '' },
      categoryNameOf,
    );
    expect(filtered.map((item) => item.id)).toEqual(['t2']);
  });

  it('支持按记录人筛选', () => {
    const list = [tx('t1'), tx('t2', { createdBy: 'u2' })];
    const filtered = filterTransactions(
      list,
      { type: 'all', kind: 'all', createdBy: 'u2', keyword: '' },
      categoryNameOf,
    );
    expect(filtered.map((item) => item.id)).toEqual(['t2']);
  });

  it('支持按分类名 / 标签名做关键词搜索', () => {
    const list = [
      tx('t1', { categoryId: 'c1', tagNames: ['午餐'] }),
      tx('t2', { categoryId: 'c2', tagNames: ['奶茶'] }),
      tx('t3', { categoryId: 'c1', tagNames: [] }),
    ];
    const byCategory = filterTransactions(
      list,
      { type: 'all', kind: 'all', createdBy: 'all', keyword: '交通' },
      categoryNameOf,
    );
    expect(byCategory.map((item) => item.id)).toEqual(['t2']);

    const byTag = filterTransactions(
      list,
      { type: 'all', kind: 'all', createdBy: 'all', keyword: '奶茶' },
      categoryNameOf,
    );
    expect(byTag.map((item) => item.id)).toEqual(['t2']);

    const byCategoryKeyword = filterTransactions(
      list,
      { type: 'all', kind: 'all', createdBy: 'all', keyword: '餐饮' },
      categoryNameOf,
    );
    expect(byCategoryKeyword.map((item) => item.id)).toEqual(['t1', 't3']);
  });
});
