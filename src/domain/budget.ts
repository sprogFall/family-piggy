/** 月度预算进度纯计算 */

export interface BudgetProgress {
  /** 已使用比例 0~1（超支封顶 1，用于进度条宽度） */
  ratio: number;
  /** 剩余预算（分），超支时为负数 */
  remainingCents: number;
  isOver: boolean;
}

export const budgetProgress = (
  expenseCents: number,
  budgetCents: number,
): BudgetProgress => {
  if (budgetCents <= 0) {
    return { ratio: 0, remainingCents: 0, isOver: false };
  }
  return {
    ratio: Math.min(expenseCents / budgetCents, 1),
    remainingCents: budgetCents - expenseCents,
    isOver: expenseCents > budgetCents,
  };
};
