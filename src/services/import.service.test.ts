import { parseCsvContent } from './import.service';

describe('parseCsvContent', () => {
  it('解析合法 CSV', () => {
    const result = parseCsvContent(
      '\uFEFF日期,类型,分类,金额(元),备注\r\n2024-05-20 14:30,支出,餐饮,12.30,午饭\r\n',
    );
    expect(result.total).toBe(2);
    expect(result.errors).toEqual([]);
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]).toMatchObject({
      kind: 'expense',
      categoryName: '餐饮',
      amountCents: 1230,
    });
  });

  it('错误行被收集', () => {
    const result = parseCsvContent('2024-05-20,支出,餐饮,abc,x');
    expect(result.drafts).toHaveLength(0);
    expect(result.errors[0].line).toBe(1);
  });
});
