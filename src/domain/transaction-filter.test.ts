import type { Transaction } from '@/types/domain';

import {
  TRANSACTION_TYPE_FILTER_OPTIONS,
  filterTransactionsByType,
  transactionMatchesTypeFilter,
} from './transaction-filter';

const tx = (id: string, reimbursement: boolean): Transaction => ({
  id,
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 100,
  currency: 'CNY',
  tagId: null,
  note: '',
  attributes: { reimbursement },
  images: [],
  occurredAt: '2024-05-20T04:00:00.000Z',
  createdBy: 'u1',
});

describe('transaction-filter', () => {
  it('提供全部 / 报销 / 未报销三个选项', () => {
    expect(TRANSACTION_TYPE_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      'all',
      'reimbursement',
      'non-reimbursement',
    ]);
  });

  it('按是否报销筛选', () => {
    const list = [tx('t1', true), tx('t2', false)];
    expect(filterTransactionsByType(list, 'all')).toHaveLength(2);
    expect(filterTransactionsByType(list, 'reimbursement').map((item) => item.id)).toEqual(['t1']);
    expect(filterTransactionsByType(list, 'non-reimbursement').map((item) => item.id)).toEqual([
      't2',
    ]);
  });

  it('单条判断与列表筛选一致', () => {
    expect(transactionMatchesTypeFilter(tx('t1', true), 'reimbursement')).toBe(true);
    expect(transactionMatchesTypeFilter(tx('t1', true), 'non-reimbursement')).toBe(false);
  });
});
