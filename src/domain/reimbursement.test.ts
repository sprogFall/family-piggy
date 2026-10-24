import type { Transaction } from '@/types/domain';

import {
  canMarkReimbursed,
  isReimbursed,
  isReimbursementEligible,
  markReimbursed,
  reimburseExcludedTotal,
  withoutReimbursed,
} from './reimbursement';

const tx = (partial: Partial<Transaction> & { id: string }): Transaction => ({
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 100,
  currency: 'CNY',
  tagNames: [],
  note: '',
  attributes: { reimbursement: false },
  images: [],
  occurredAt: new Date(2024, 4, 20, 12, 0).toISOString(),
  createdBy: 'u1',
  ...partial,
});

/** 可报销但尚未报销 */
const eligible = (partial: Partial<Transaction> & { id: string }): Transaction =>
  tx({ ...partial, attributes: { reimbursement: true, ...partial.attributes } });

/** 已报销 */
const reimbursed = (partial: Partial<Transaction> & { id: string }): Transaction =>
  tx({ ...partial, attributes: { reimbursement: true, reimbursed: true, ...partial.attributes } });

describe('isReimbursementEligible', () => {
  it('仅标记了报销的单据可报销', () => {
    expect(isReimbursementEligible(eligible({ id: '1' }))).toBe(true);
    expect(isReimbursementEligible(tx({ id: '2' }))).toBe(false);
  });

  it('只有支出可报销：收入即使带标记也不可报销', () => {
    expect(isReimbursementEligible(eligible({ id: '1', kind: 'income' }))).toBe(false);
  });

  it('已报销的单据不再属于「待报销」', () => {
    expect(isReimbursementEligible(reimbursed({ id: '1' }))).toBe(false);
  });
});

describe('canMarkReimbursed', () => {
  it('可报销的支出无论是否已报销都可操作（已报销需能取消）', () => {
    expect(canMarkReimbursed(eligible({ id: '1' }))).toBe(true);
    expect(canMarkReimbursed(reimbursed({ id: '2' }))).toBe(true);
  });

  it('未标记报销的支出与收入都不可操作', () => {
    expect(canMarkReimbursed(tx({ id: '1' }))).toBe(false);
    expect(canMarkReimbursed(eligible({ id: '2', kind: 'income' }))).toBe(false);
  });
});

describe('isReimbursed', () => {
  it('只有 reimbursement 与 reimbursed 同时为真才算已报销', () => {
    expect(isReimbursed(reimbursed({ id: '1' }))).toBe(true);
    expect(isReimbursed(eligible({ id: '2' }))).toBe(false);
    expect(isReimbursed(tx({ id: '3' }))).toBe(false);
  });

  it('缺少报销标记时忽略残留的 reimbursed', () => {
    expect(isReimbursed(tx({ id: '1', attributes: { reimbursement: false, reimbursed: true } }))).toBe(
      false,
    );
  });
});

describe('markReimbursed', () => {
  it('置为已报销时保留原有扩展属性', () => {
    const before = eligible({ id: '1', attributes: { reimbursement: true, meal: true } });
    const after = markReimbursed(before, true);

    expect(after.attributes).toEqual({ reimbursement: true, meal: true, reimbursed: true });
    expect(before.attributes.reimbursed).toBeUndefined();
  });

  it('取消报销时移除 reimbursed 而不是留 false', () => {
    const after = markReimbursed(reimbursed({ id: '1' }), false);
    expect(after.attributes).toEqual({ reimbursement: true });
  });
});

describe('withoutReimbursed', () => {
  it('剔除已报销流水，未报销与不可报销的保留', () => {
    const list = [
      reimbursed({ id: '1' }),
      eligible({ id: '2' }),
      tx({ id: '3' }),
    ];
    expect(withoutReimbursed(list).map((item) => item.id)).toEqual(['2', '3']);
  });

  it('空数据返回空数组', () => {
    expect(withoutReimbursed([])).toEqual([]);
  });
});

describe('reimburseExcludedTotal', () => {
  it('按币种汇总被剔除的已报销支出', () => {
    const list = [
      reimbursed({ id: '1', amount: 2368 }),
      reimbursed({ id: '2', amount: 5000 }),
      eligible({ id: '3', amount: 999 }),
      tx({ id: '4', amount: 100 }),
    ];
    expect(reimburseExcludedTotal(list, 'CNY')).toBe(7368);
  });

  it('不跨币种相加', () => {
    const list = [
      reimbursed({ id: '1', amount: 1000 }),
      reimbursed({ id: '2', amount: 9999, currency: 'USD' }),
    ];
    expect(reimburseExcludedTotal(list, 'CNY')).toBe(1000);
    expect(reimburseExcludedTotal(list, 'USD')).toBe(9999);
  });

  it('无已报销流水时为 0', () => {
    expect(reimburseExcludedTotal([], 'CNY')).toBe(0);
    expect(reimburseExcludedTotal([eligible({ id: '1' })], 'CNY')).toBe(0);
  });
});