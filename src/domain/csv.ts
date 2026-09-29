/**
 * 导入导出（CSV）纯函数：Excel 导出走 xlsx 库，但表格行数据由这里统一产出。
 */

import type { Transaction, TxKind } from '@/types/domain';

import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from './currency';
import { formatCents, parseAmountToCents } from './money';
import { parseDateTimeCN } from './dates';

export const CSV_BOM = '\uFEFF';
/**
 * 前 5 列保持稳定，后面依次追加新增列：旧版本导出的 5 列文件仍可导入
 * （缺省按 CNY、备注为空、不报销），列顺序变化只影响新增列，不会让老文件错位。
 */
export const CSV_HEADERS = ['日期', '类型', '分类', '金额', '标签', '币种', '备注', '报销'] as const;

export const KIND_BY_LABEL: Record<string, TxKind> = {
  支出: 'expense',
  收入: 'income',
};

export interface CsvDraft {
  occurredAt: string;
  kind: TxKind;
  categoryName: string;
  amountCents: number;
  tagName: string;
  currency: CurrencyCode;
  note: string;
  reimbursement: boolean;
}

const escapeCell = (value: string): string =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/** 生成带 BOM 的 CSV 内容（保证 Excel 打开中文不乱码），行尾 CRLF */
export const draftsToCsv = (drafts: CsvDraft[]): string => {
  const lines = [CSV_HEADERS.join(',')];
  for (const draft of drafts) {
    lines.push(
      [
        draft.occurredAt,
        draft.kind === 'expense' ? '支出' : '收入',
        escapeCell(draft.categoryName),
        formatCents(draft.amountCents, { thousands: false }),
        escapeCell(draft.tagName),
        draft.currency,
        escapeCell(draft.note),
        draft.reimbursement ? '是' : '否',
      ].join(','),
    );
  }
  return CSV_BOM + lines.join('\r\n');
};

export const transactionToDraft = (
  tx: Transaction,
  categoryNameOf: (categoryId: string) => string,
  tagNameOf: (tagId: string) => string,
): CsvDraft => ({
  occurredAt: formatDateTimeCN(tx.occurredAt),
  kind: tx.kind,
  categoryName: categoryNameOf(tx.categoryId),
  amountCents: tx.amount,
  tagName: tx.tagId ? tagNameOf(tx.tagId) : '',
  currency: tx.currency,
  note: tx.note,
  reimbursement: tx.attributes.reimbursement,
});

const formatDateTimeCN = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

/** RFC4180 简化解析：支持引号、转义引号、逗号、CRLF/LF */
export const parseCsv = (content: string): string[][] => {
  const text = content.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = '';
  };
  const pushRow = () => {
    pushCell();
    // 跳过全空行
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushCell();
    } else if (ch === '\n') {
      pushRow();
    } else if (ch === '\r') {
      // CRLF：交给 \n 处理；裸 CR 也按行结束
      if (text[i + 1] === '\n') i++;
      pushRow();
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) pushRow();
  return rows;
};

export interface CsvParseResult {
  drafts: CsvDraft[];
  errors: { line: number; message: string }[];
}

const isHeaderRow = (row: string[]): boolean => row[0]?.trim() === '日期';

/** 将 CSV 二维表解析为草稿；行号从 1 开始计（含表头） */
export const csvToDrafts = (rows: string[][]): CsvParseResult => {
  const drafts: CsvDraft[] = [];
  const errors: { line: number; message: string }[] = [];

  rows.forEach((row, index) => {
    const lineNo = index + 1;
    if (index === 0 && isHeaderRow(row)) return;
    if (row.every((c) => c.trim() === '')) return;

    const [
      dateCell = '',
      kindCell = '',
      nameCell = '',
      amountCell = '',
      tagCell = '',
      currencyCell = '',
      noteCell = '',
      reimbursementCell = '',
    ] = row;

    const date = parseDateTimeCN(dateCell);
    if (!date) {
      errors.push({ line: lineNo, message: `日期无法解析：${dateCell}` });
      return;
    }
    const kind = KIND_BY_LABEL[kindCell.trim()];
    if (!kind) {
      errors.push({ line: lineNo, message: `类型必须是 支出/收入：${kindCell}` });
      return;
    }
    const categoryName = nameCell.trim();
    if (!categoryName) {
      errors.push({ line: lineNo, message: '分类不能为空' });
      return;
    }
    const amountCents = parseAmountToCents(amountCell.replace(/[¥￥]/g, ''));
    if (amountCents === null) {
      errors.push({ line: lineNo, message: `金额无效：${amountCell}` });
      return;
    }
    // 旧文件没有币种列：缺省按人民币
    const currencyRaw = currencyCell.trim().toUpperCase();
    if (currencyRaw !== '' && !isCurrencyCode(currencyRaw)) {
      errors.push({ line: lineNo, message: `币种无效：${currencyCell}` });
      return;
    }
    const reimbursementRaw = reimbursementCell.trim();
    if (reimbursementRaw !== '' && reimbursementRaw !== '是' && reimbursementRaw !== '否') {
      errors.push({ line: lineNo, message: `报销只能填 是/否：${reimbursementCell}` });
      return;
    }

    drafts.push({
      occurredAt: date.toISOString(),
      kind,
      categoryName,
      amountCents,
      tagName: tagCell.trim(),
      currency: currencyRaw === '' ? DEFAULT_CURRENCY : currencyRaw,
      note: noteCell.trim(),
      reimbursement: reimbursementRaw === '是',
    });
  });

  return { drafts, errors };
};
