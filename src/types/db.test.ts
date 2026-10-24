import { toTransaction, type TransactionRow } from './db';

/**
 * attributes 以 JSONB 存储，报销相关的两个字段语义不同：
 * - reimbursement：可报销（记账时标记）；
 * - reimbursed：已报销（账单页右滑确认），未报销时必须保持 undefined 而不是 false。
 */

const row = (attributes: Record<string, unknown>): TransactionRow =>
  ({
    id: 't1',
    ledger_id: 'l1',
    category_id: 'c1',
    kind: 'expense',
    amount: '100',
    currency: 'CNY',
    tag_names: [],
    note: '',
    attributes,
    images: [],
    occurred_at: '2024-05-20T00:00:00.000Z',
    created_by: 'u1',
  }) as unknown as TransactionRow;

describe('toTransaction 的报销属性映射', () => {
  it('透传 reimbursement 与 reimbursed', () => {
    expect(toTransaction(row({ reimbursement: true, reimbursed: true })).attributes).toEqual({
      reimbursement: true,
      reimbursed: true,
    });
  });

  it('未报销时不落 reimbursed 字段，保持 undefined 语义', () => {
    expect(toTransaction(row({ reimbursement: true })).attributes).toEqual({
      reimbursement: true,
    });
    expect(toTransaction(row({ reimbursement: true, reimbursed: false })).attributes).toEqual({
      reimbursement: true,
    });
  });

  it('原样保留 reimbursed；是否生效由 domain 的 isReimbursed 判定（必须同时可报销）', () => {
    // 数据库可能残留 reimbursement 被关掉、reimbursed 仍在的历史数据：
    // 映射层不做业务裁剪，只保证字段不丢，由领域层统一裁决
    expect(toTransaction(row({ reimbursed: true })).attributes).toEqual({
      reimbursement: false,
      reimbursed: true,
    });
  });

  it('缺少 attributes 时给出默认值', () => {
    expect(toTransaction(row(null as unknown as Record<string, unknown>)).attributes).toEqual({
      reimbursement: false,
    });
  });

  it('预留的未知布尔字段原样透传', () => {
    expect(toTransaction(row({ reimbursement: false, meal: true })).attributes).toEqual({
      reimbursement: false,
      meal: true,
    });
  });
});