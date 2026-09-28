import type { Transaction } from '@/types/domain';

import { csvToDrafts, draftsToCsv, parseCsv, transactionToDraft } from './csv';

describe('draftsToCsv', () => {
  it('生成带 BOM、表头与 CRLF 的内容', () => {
    const csv = draftsToCsv([
      {
        occurredAt: '2024-05-20 14:30',
        kind: 'expense',
        categoryName: '餐饮',
        amountCents: 1230,
        tagName: '午饭',
        currency: 'CNY',
      },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('日期,类型,分类,金额,标签,币种');
    expect(csv).toContain('2024-05-20 14:30,支出,餐饮,12.30,午饭,CNY');
    expect(csv.endsWith('\r\n')).toBe(false);
  });

  it('标签含逗号与引号时转义', () => {
    const csv = draftsToCsv([
      {
        occurredAt: '2024-05-20 14:30',
        kind: 'income',
        categoryName: '工资',
        amountCents: 100,
        tagName: '含,逗号"引号"',
        currency: 'USD',
      },
    ]);
    expect(csv).toContain('"含,逗号""引号"""');
  });
});

describe('transactionToDraft', () => {
  it('映射字段并按分类 / 标签函数取名称', () => {
    const tx: Transaction = {
      id: 't1',
      ledgerId: 'l1',
      categoryId: 'c1',
      kind: 'expense',
      amount: 1230,
      currency: 'CNY',
      tagId: 'g1',
      occurredAt: new Date(2024, 4, 20, 14, 30).toISOString(),
      createdBy: 'u1',
    };
    const draft = transactionToDraft(
      tx,
      (id) => (id === 'c1' ? '餐饮' : ''),
      (id) => (id === 'g1' ? '午饭' : ''),
    );
    expect(draft).toEqual({
      occurredAt: '2024-05-20 14:30',
      kind: 'expense',
      categoryName: '餐饮',
      amountCents: 1230,
      tagName: '午饭',
      currency: 'CNY',
    });
  });
});

describe('parseCsv', () => {
  it('解析普通行', () => {
    expect(parseCsv('a,b,c\r\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('支持引号内逗号、转义引号与换行', () => {
    const rows = parseCsv('"x,y","say ""hi""","multi\nline"');
    expect(rows).toEqual([['x,y', 'say "hi"', 'multi\nline']]);
  });

  it('剔除 BOM 与全空行', () => {
    expect(parseCsv('\uFEFFa,b\n\n\nc,d\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('csvToDrafts', () => {
  it('解析含表头的合法数据', () => {
    const { drafts, errors } = csvToDrafts([
      ['日期', '类型', '分类', '金额(元)', '标签'],
      ['2024-05-20 14:30', '支出', '餐饮', '12.30', '午饭'],
      ['2024-05-21', '收入', '工资', '3,800.00', ''],
    ]);
    expect(errors).toEqual([]);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({ kind: 'expense', categoryName: '餐饮', amountCents: 1230 });
    expect(drafts[1]).toMatchObject({ kind: 'income', categoryName: '工资', amountCents: 380000 });
  });

  it('旧版 5 列文件缺省按 CNY 导入', () => {
    const { drafts } = csvToDrafts([['2024-05-20', '支出', '餐饮', '10', '午饭']]);
    expect(drafts[0].currency).toBe('CNY');
  });

  it('解析币种列并转为大写，非法币种按行报错', () => {
    const { drafts, errors } = csvToDrafts([
      ['2024-05-20', '支出', '餐饮', '10', '午饭', 'usd'],
      ['2024-05-21', '支出', '餐饮', '10', '', 'RMB'],
    ]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].currency).toBe('USD');
    expect(errors).toEqual([{ line: 2, message: '币种无效：RMB' }]);
  });

  it('逐行报告错误但不中断', () => {
    const { drafts, errors } = csvToDrafts([
      ['2024-05-20', '支出', '餐饮', '10', ''],
      ['bad-date', '支出', '餐饮', '10', ''],
      ['2024-05-21', '转帐', '餐饮', '10', ''],
      ['2024-05-22', '支出', '', '10', ''],
      ['2024-05-23', '支出', '餐饮', 'abc', ''],
    ]);
    expect(drafts).toHaveLength(1);
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4, 5]);
  });
});
