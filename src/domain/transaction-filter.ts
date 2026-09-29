import type { Transaction, TxKind } from '@/types/domain';

/** 账单列表的记账类型筛选：已去掉「未报销」选项。 */
export type TransactionTypeFilterValue = 'all' | 'reimbursement';

export interface TransactionTypeFilterOption {
  value: TransactionTypeFilterValue;
  label: string;
}

export const TRANSACTION_TYPE_FILTER_OPTIONS: TransactionTypeFilterOption[] = [
  { value: 'all', label: '全部' },
  { value: 'reimbursement', label: '报销' },
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
  }
};

/** 收入 / 支出筛选 */
export type TransactionKindFilterValue = 'all' | TxKind;

export interface TransactionFilterCriteria {
  type: TransactionTypeFilterValue;
  kind: TransactionKindFilterValue;
  /** 全部记录人使用 'all' */
  createdBy: string;
  /** 按分类名 / 标签名搜索 */
  keyword: string;
}

/** 组合筛选：记账类型、收入/支出、记录人、分类/标签关键词 */
export const filterTransactions = (
  transactions: Transaction[],
  criteria: TransactionFilterCriteria,
  categoryNameOf: (categoryId: string) => string,
  tagNameOf: (tagId: string) => string,
): Transaction[] => {
  const keyword = criteria.keyword.trim().toLowerCase();
  return transactions.filter((transaction) => {
    if (!transactionMatchesTypeFilter(transaction, criteria.type)) return false;
    if (criteria.kind !== 'all' && transaction.kind !== criteria.kind) return false;
    if (criteria.createdBy !== 'all' && transaction.createdBy !== criteria.createdBy) return false;
    if (keyword === '') return true;

    const categoryName = categoryNameOf(transaction.categoryId).toLowerCase();
    const tagNames = transaction.tagIds
      .map(tagNameOf)
      .join(' ')
      .toLowerCase();
    return categoryName.includes(keyword) || tagNames.includes(keyword);
  });
};
