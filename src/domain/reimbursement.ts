/**
 * 报销状态：区分「可报销」（记账时标记）与「已报销」（账单页右滑确认）。
 *
 * 两者是不同语义，必须分开存储：
 * - `reimbursement`：这笔支出是否公司 / 他人可报销，记账时勾选，用于筛选；
 * - `reimbursed`：这笔可报销支出是否已实际报销，账单页右滑确认。
 * 只有 `reimbursement` 为真的支出才允许被标记为已报销，避免收入等被误标。
 */

import type { Transaction } from '@/types/domain';

/** 该笔是否为「待报销」：可报销的支出且尚未报销 */
export const isReimbursementEligible = (transaction: Transaction): boolean =>
  transaction.kind === 'expense' &&
  transaction.attributes.reimbursement === true &&
  transaction.attributes.reimbursed !== true;

/**
 * 该笔能否使用报销操作（右滑）：可报销的支出，无论是否已报销。
 * 「待报销」用于筛选待办，已报销的仍需提供取消报销入口，故两者判定不同。
 */
export const canMarkReimbursed = (transaction: Transaction): boolean =>
  transaction.kind === 'expense' && transaction.attributes.reimbursement === true;

/** 该笔是否已报销 */
export const isReimbursed = (transaction: Transaction): boolean =>
  transaction.attributes.reimbursement === true && transaction.attributes.reimbursed === true;

/**
 * 返回标记报销后的新流水（不修改入参）。
 * 取消报销时删除 `reimbursed` 字段而不是留 `false`：属性以 JSONB 存储，
 * 保留 `false` 会让「从未报销」与「取消过报销」两种状态无法区分。
 */
export const markReimbursed = (
  transaction: Transaction,
  reimbursed: boolean,
): Transaction => {
  const attributes = { ...transaction.attributes };
  if (reimbursed) attributes.reimbursed = true;
  else delete attributes.reimbursed;
  return { ...transaction, attributes };
};

/** 剔除已报销流水，用于「总消费」等口径的统计 */
export const withoutReimbursed = (transactions: Transaction[]): Transaction[] =>
  transactions.filter((transaction) => !isReimbursed(transaction));

/** 汇总某币种下被剔除的已报销支出金额（分） */
export const reimburseExcludedTotal = (
  transactions: Transaction[],
  currency: string,
): number =>
  transactions.reduce(
    (sum, transaction) =>
      transaction.currency === currency && isReimbursed(transaction)
        ? sum + transaction.amount
        : sum,
    0,
  );