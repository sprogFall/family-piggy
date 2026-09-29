import { buildExportAoa, EXPORT_FORMAT_LABEL } from './export.service';
import type { CsvDraft } from '@/domain/csv';

describe('buildExportAoa', () => {
  it('首行表头 + 数据行，金额为元的两位小数字符串', () => {
    const drafts: CsvDraft[] = [
      {
        occurredAt: '2024-05-20 14:30',
        kind: 'expense',
        categoryName: '餐饮',
        amountCents: 236800,
        tagName: '聚餐',
        currency: 'CNY',
        note: '部门聚餐',
        reimbursement: true,
      },
      {
        occurredAt: '2024-05-21 09:00',
        kind: 'income',
        categoryName: '工资',
        amountCents: 5,
        tagName: '',
        currency: 'USD',
        note: '',
        reimbursement: false,
      },
    ];
    const aoa = buildExportAoa(drafts);
    expect(aoa[0]).toEqual(['日期', '类型', '分类', '金额', '标签', '币种', '备注', '报销']);
    expect(aoa[1]).toEqual([
      '2024-05-20 14:30',
      '支出',
      '餐饮',
      '2368.00',
      '聚餐',
      'CNY',
      '部门聚餐',
      '是',
    ]);
    expect(aoa[2]).toEqual(['2024-05-21 09:00', '收入', '工资', '0.05', '', 'USD', '', '否']);
  });

  it('空数据仅表头', () => {
    expect(buildExportAoa([])).toEqual([
      ['日期', '类型', '分类', '金额', '标签', '币种', '备注', '报销'],
    ]);
  });
});

describe('EXPORT_FORMAT_LABEL', () => {
  it('两种格式均有文案', () => {
    expect(EXPORT_FORMAT_LABEL.xlsx).toBe('Excel (.xlsx)');
    expect(EXPORT_FORMAT_LABEL.csv).toBe('CSV (.csv)');
  });
});
