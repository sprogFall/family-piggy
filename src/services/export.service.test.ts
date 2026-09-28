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
      },
      {
        occurredAt: '2024-05-21 09:00',
        kind: 'income',
        categoryName: '工资',
        amountCents: 5,
        tagName: '',
      },
    ];
    const aoa = buildExportAoa(drafts);
    expect(aoa[0]).toEqual(['日期', '类型', '分类', '金额(元)', '标签']);
    expect(aoa[1]).toEqual(['2024-05-20 14:30', '支出', '餐饮', '2368.00', '聚餐']);
    expect(aoa[2]).toEqual(['2024-05-21 09:00', '收入', '工资', '0.05', '']);
  });

  it('空数据仅表头', () => {
    expect(buildExportAoa([])).toEqual([['日期', '类型', '分类', '金额(元)', '标签']]);
  });
});

describe('EXPORT_FORMAT_LABEL', () => {
  it('两种格式均有文案', () => {
    expect(EXPORT_FORMAT_LABEL.xlsx).toBe('Excel (.xlsx)');
    expect(EXPORT_FORMAT_LABEL.csv).toBe('CSV (.csv)');
  });
});
