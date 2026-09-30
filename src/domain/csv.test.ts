import type { Transaction } from '@/types/domain';

import { csvToDrafts, draftsToCsv, parseCsv, splitTagNames, transactionToDraft } from './csv';

describe('draftsToCsv', () => {
  it('生成带 BOM、表头与 CRLF 的内容', () => {
    const csv = draftsToCsv([
      {
        occurredAt: '2024-05-20 14:30',
        kind: 'expense',
        categoryName: '餐饮',
        tagName: '午饭',
        note: '和同事',
        amountCents: 1230,
        currency: 'CNY',
        recorderName: '小明',
        reimbursement: true,
      },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('日期,类型,分类,标签,备注,金额,币种,记录人,报销');
    expect(csv).toContain('2024-05-20 14:30,支出,餐饮,午饭,和同事,12.30,CNY,小明,是');
    expect(csv.endsWith('\r\n')).toBe(false);
  });

  it('标签、备注、记录人含逗号与引号时转义', () => {
    const csv = draftsToCsv([
      {
        occurredAt: '2024-05-20 14:30',
        kind: 'income',
        categoryName: '工资',
        tagName: '含,逗号"引号"',
        note: '备注,也要转义',
        amountCents: 100,
        currency: 'USD',
        recorderName: '记录,人',
        reimbursement: false,
      },
    ]);
    expect(csv).toContain('"含,逗号""引号"""');
    expect(csv).toContain('"备注,也要转义"');
    expect(csv).toContain('"记录,人"');
  });
});

describe('transactionToDraft', () => {
  it('映射字段并按分类 / 标签 / 记录人函数取名称', () => {
    const tx: Transaction = {
      id: 't1',
      ledgerId: 'l1',
      categoryId: 'c1',
      kind: 'expense',
      amount: 1230,
      currency: 'CNY',
      tagNames: ['午饭'],
      note: '和客户吃饭',
      attributes: { reimbursement: true },
      images: ['https://cdn/receipt.jpg'],
      occurredAt: new Date(2024, 4, 20, 14, 30).toISOString(),
      createdBy: 'u1',
    };
    const draft = transactionToDraft(
      tx,
      (id) => (id === 'c1' ? '餐饮' : ''),
      () => '小明',
    );
    expect(draft).toEqual({
      occurredAt: '2024-05-20 14:30',
      kind: 'expense',
      categoryName: '餐饮',
      tagName: '午饭',
      note: '和客户吃饭',
      amountCents: 1230,
      currency: 'CNY',
      recorderName: '小明',
      reimbursement: true,
    });
  });
});

describe('splitTagNames', () => {
  it('按 / 拆分多个标签并去重、去空白', () => {
    expect(splitTagNames('午餐/晚餐')).toEqual(['午餐', '晚餐']);
    expect(splitTagNames(' 午餐 / 晚餐 /  / 午餐 ')).toEqual(['午餐', '晚餐']);
    expect(splitTagNames('午餐／晚餐')).toEqual(['午餐', '晚餐']);
  });
});

describe('transactionToDraft 多标签', () => {
  it('多标签按 / 拼接导出，便于再次导入时拆分', () => {
    const tx: Transaction = {
      id: 't1',
      ledgerId: 'l1',
      categoryId: 'c1',
      kind: 'expense',
      amount: 1230,
      currency: 'CNY',
      tagNames: ['午餐', '晚餐'],
      note: '',
      attributes: { reimbursement: false },
      images: [],
      occurredAt: new Date(2024, 4, 20, 14, 30).toISOString(),
      createdBy: 'u1',
    };
    const draft = transactionToDraft(tx, () => '餐饮', () => '');
    expect(draft.tagName).toBe('午餐/晚餐');
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
      ['日期', '类型', '分类', '标签', '备注', '金额', '币种', '记录人', '报销'],
      ['2024-05-20 14:30', '支出', '餐饮', '午饭', '和同事', '12.30', 'CNY', '小明', '是'],
      ['2024-05-21', '收入', '工资', '', '', '3,800.00', 'CNY', '', '否'],
    ]);
    expect(errors).toEqual([]);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      kind: 'expense',
      categoryName: '餐饮',
      tagName: '午饭',
      note: '和同事',
      amountCents: 1230,
      recorderName: '小明',
      reimbursement: true,
    });
    expect(drafts[1]).toMatchObject({
      kind: 'income',
      categoryName: '工资',
      amountCents: 380000,
      currency: 'CNY',
      recorderName: '',
      reimbursement: false,
    });
  });

  it('识别真实文件常用表头：交易类型 / 类别 / 描述 / 创建者 / 是否报销', () => {
    const { drafts, errors } = csvToDrafts([
      ['日期', '交易类型', '类别', '标签', '描述', '金额', '币种', '创建者', '是否报销'],
      ['2026-09-29 00:00', '支出', '餐饮', '午餐', '', '30', 'CNY', 'A橘子', ''],
    ]);
    expect(errors).toEqual([]);
    expect(drafts[0]).toMatchObject({
      kind: 'expense',
      categoryName: '餐饮',
      tagName: '午餐',
      amountCents: 3000,
      currency: 'CNY',
      recorderName: 'A橘子',
      reimbursement: false,
    });
  });

  it('表头列顺序变化时按名称归位，缺失的记录人 / 币种走缺省值', () => {
    const { drafts, errors } = csvToDrafts([
      ['日期', '类型', '分类', '金额(元)', '标签', '币种', '备注', '报销'],
      ['2024-05-20', '支出', '餐饮', '10', '午饭', 'usd', '备注', '否'],
    ]);
    expect(errors).toEqual([]);
    expect(drafts[0]).toMatchObject({
      amountCents: 1000,
      tagName: '午饭',
      currency: 'USD',
      note: '备注',
      recorderName: '',
      reimbursement: false,
    });
  });

  it('无表头时按新列顺序解析', () => {
    const { drafts } = csvToDrafts([
      ['2024-05-20', '支出', '餐饮', '午饭', '备注', '10', 'CNY', '小明', '否'],
    ]);
    expect(drafts[0]).toMatchObject({
      categoryName: '餐饮',
      tagName: '午饭',
      note: '备注',
      currency: 'CNY',
      recorderName: '小明',
      reimbursement: false,
    });
  });

  it('币种列转为大写，非法币种按行报错', () => {
    const { drafts, errors } = csvToDrafts([
      ['2024-05-20', '支出', '餐饮', '午饭', '备注', '10', 'usd', ''],
      ['2024-05-21', '支出', '餐饮', '', '', '10', 'RMB', ''],
    ]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].currency).toBe('USD');
    expect(errors).toEqual([{ line: 2, message: '币种无效：RMB' }]);
  });

  it('报销列只接受 是/否（旧文件空列视为否）', () => {
    const { drafts, errors } = csvToDrafts([
      ['2024-05-20', '支出', '餐饮', '', '', '10', 'CNY', '', '是'],
      ['2024-05-21', '支出', '餐饮', '', '', '10', 'CNY', '', 'ok'],
    ]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].reimbursement).toBe(true);
    expect(errors).toEqual([{ line: 2, message: '报销只能填 是/否：ok' }]);
  });

  it('逐行报告错误但不中断', () => {
    const { drafts, errors } = csvToDrafts([
      ['2024-05-20', '支出', '餐饮', '标签', '备注', '10'],
      ['bad-date', '支出', '餐饮', '', '', '10'],
      ['2024-05-21', '转帐', '餐饮', '', '', '10'],
      ['2024-05-22', '支出', '', '', '', '10'],
      ['2024-05-23', '支出', '餐饮', '', '', 'abc'],
    ]);
    expect(drafts).toHaveLength(1);
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4, 5]);
  });
});
