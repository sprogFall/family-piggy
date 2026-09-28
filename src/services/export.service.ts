import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { utils, write } from 'xlsx';

import { draftsToCsv, CSV_HEADERS, transactionToDraft, type CsvDraft } from '@/domain/csv';
import { formatCents } from '@/domain/money';
import { monthKey, type MonthRef } from '@/domain/dates';
import type { Transaction, TxKind } from '@/types/domain';

export type ExportFormat = 'xlsx' | 'csv';

export const EXPORT_FORMAT_LABEL: Record<ExportFormat, string> = {
  xlsx: 'Excel (.xlsx)',
  csv: 'CSV (.csv)',
};

/** 生成表格二维数组（首行表头），供 xlsx 与预览共用 */
export const buildExportAoa = (drafts: CsvDraft[]): (string | number)[][] => [
  [...CSV_HEADERS],
  ...drafts.map((draft) => [
    draft.occurredAt,
    draft.kind === 'expense' ? '支出' : '收入',
    draft.categoryName,
    formatCents(draft.amountCents, { thousands: false }),
    draft.tagName,
    draft.currency,
  ]),
];

export interface ExportOptions {
  ledgerName: string;
  month: MonthRef;
  format: ExportFormat;
}

/** 导出并唤起系统分享，返回文件 URI */
export const exportTransactions = async (
  transactions: Transaction[],
  categoryNameOf: (categoryId: string) => string,
  tagNameOf: (tagId: string) => string,
  options: ExportOptions,
): Promise<string> => {
  const drafts = transactions
    .map((tx) => transactionToDraft(tx, categoryNameOf, tagNameOf))
    .sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1));

  const base = `记账-${options.ledgerName}-${monthKey(options.month)}`;
  const dir = FileSystem.cacheDirectory ?? '';
  const fileUri = `${dir}${base}.${options.format}`;

  if (options.format === 'csv') {
    await FileSystem.writeAsStringAsync(fileUri, draftsToCsv(drafts), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } else {
    const workbook = utils.book_new();
    const sheet = utils.aoa_to_sheet(buildExportAoa(drafts));
    utils.book_append_sheet(workbook, sheet, '账单');
    const base64 = write(workbook, { bookType: 'xlsx', type: 'base64' }) as string;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri);
  }
  return fileUri;
};

export const kindLabelOf = (kind: TxKind): string => (kind === 'expense' ? '支出' : '收入');
