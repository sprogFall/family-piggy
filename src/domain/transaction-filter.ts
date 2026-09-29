import type { Transaction } from '@/types/domain';

/** 账单列表的记账类型筛选：当前只有报销/未报销，后续扩展时在此追加选项。 */
export type TransactionTypeFilterValue = 'all' | 'reimbursement' | 'non-reimbursement';

export interface TransactionTypeFilterOption {
  value: TransactionTypeFilterValue;
  label: string;
}

export const TRANSACTION_TYPE_FILTER_OPTIONS: TransactionTypeFilterOption[] = [
  { value: 'all', label: '全部' },
  { value: 'reimbursement', label: '报销' },
  { value: 'non-reimbursement', label: '未报销' },
];

export const transactionMatchesTypeFilter = (
  transaction: Transaction,
  filter: TransactionTypeFilterValue,
): boolean => {
  switch (filter) {
    case 'all':
      return true;
    case 'reimbursement':
      return transaction.attributes.reimbursement;
    case 'non-reimbursement':
      return !transaction.attributes.reimbursement;
  }
};

export const filterTransactionsByType = (
  transactions: Transaction[],
  filter: TransactionTypeFilterValue,
): Transaction[] =>
  filter === 'all'
    ? transactions
    : transactions.filter((transaction) => transactionMatchesTypeFilter(transaction, filter));
