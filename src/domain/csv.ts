/**
 * 导入导出（CSV）纯函数：Excel 导出走 xlsx 库，但表格行数据由这里统一产出。
 */

import type { Transaction, TxKind } from '@/types/domain';

import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from './currency';
import { formatCents, parseAmountToCents } from './money';
import { parseDateTimeCN } from './dates';

export const CSV_BOM = '\uFEFF';

/** 导入导出列顺序：日期、类型、分类、标签、备注、金额、币种、记录人、报销 */
export const CSV_HEADERS = [
  '日期',
  '类型',
  '分类',
  '标签',
  '备注',
  '金额',
  '币种',
  '记录人',
  '报销',
] as const;

export const KIND_BY_LABEL: Record<string, TxKind> = {
  支出: 'expense',
  收入: 'income',
};

export interface CsvDraft {
  occurredAt: string;
  kind: TxKind;
  categoryName: string;
  tagName: string;
  note: string;
  amountCents: number;
  currency: CurrencyCode;
  recorderName: string;
  reimbursement: boolean;
}

type CsvColumn =
  | 'occurredAt'
  | 'kind'
  | 'categoryName'
  | 'tagName'
  | 'note'
  | 'amount'
  | 'currency'
  | 'recorderName'
  | 'reimbursement';

/** 无表头时按导入格式约定的列顺序读取 */
const DEFAULT_POSITION: Record<CsvColumn, number> = {
  occurredAt: 0,
  kind: 1,
  categoryName: 2,
  tagName: 3,
  note: 4,
  amount: 5,
  currency: 6,
  recorderName: 7,
  reimbursement: 8,
};

/** 兼容常见的旧表头 / 同义表头，列顺序变化也能按名称归位 */
const HEADER_ALIASES: Record<string, CsvColumn> = {
  日期: 'occurredAt',
  类型: 'kind',
  收支类型: 'kind',
  '支出/收入': 'kind',
  '支出/收入类型': 'kind',
  分类: 'categoryName',
  标签: 'tagName',
  备注: 'note',
  金额: 'amount',
  '金额(元)': 'amount',
  '金额（元）': 'amount',
  币种: 'currency',
  记录人: 'recorderName',
  报销: 'reimbursement',
};

const normalizeHeader = (cell: string): string => cell.trim().replace(/\s+/g, '');

const buildHeaderMap = (row: string[]): Partial<Record<CsvColumn, number>> => {
  const map: Partial<Record<CsvColumn, number>> = {};
  row.forEach((cell, index) => {
    const column = HEADER_ALIASES[normalizeHeader(cell)];
    if (column && map[column] === undefined) map[column] = index;
  });
  return map;
};

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
        escapeCell(draft.tagName),
        escapeCell(draft.note),
        formatCents(draft.amountCents, { thousands: false }),
        draft.currency,
        escapeCell(draft.recorderName),
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
  recorderNameOf: (createdBy: string) => string,
): CsvDraft => ({
  occurredAt: formatDateTimeCN(tx.occurredAt),
  kind: tx.kind,
  categoryName: categoryNameOf(tx.categoryId),
  tagName: tx.tagId ? tagNameOf(tx.tagId) : '',
  note: tx.note,
  amountCents: tx.amount,
  currency: tx.currency,
  recorderName: recorderNameOf(tx.createdBy),
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

/** 将 CSV 二维表解析为草稿；行号从 1 开始计（含表头） */
export const csvToDrafts = (rows: string[][]): CsvParseResult => {
  const drafts: CsvDraft[] = [];
  const errors: { line: number; message: string }[] = [];
  const firstRowIsHeader = rows.length > 0 && normalizeHeader(rows[0][0] ?? '') === '日期';
  const headerMap = firstRowIsHeader ? buildHeaderMap(rows[0]) : null;

  const cellOf = (row: string[], column: CsvColumn): string => {
    const index = headerMap ? headerMap[column] : DEFAULT_POSITION[column];
    return index === undefined ? '' : (row[index] ?? '');
  };

  rows.forEach((row, index) => {
    const lineNo = index + 1;
    if (index === 0 && firstRowIsHeader) return;
    if (row.every((c) => c.trim() === '')) return;

    const dateCell = cellOf(row, 'occurredAt');
    const kindCell = cellOf(row, 'kind');
    const nameCell = cellOf(row, 'categoryName');
    const amountCell = cellOf(row, 'amount');
    const tagCell = cellOf(row, 'tagName');
    const currencyCell = cellOf(row, 'currency');
    const noteCell = cellOf(row, 'note');
    const recorderCell = cellOf(row, 'recorderName');
    const reimbursementCell = cellOf(row, 'reimbursement');

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
      tagName: tagCell.trim(),
      note: noteCell.trim(),
      amountCents,
      currency: currencyRaw === '' ? DEFAULT_CURRENCY : currencyRaw,
      recorderName: recorderCell.trim(),
      reimbursement: reimbursementRaw === '是',
    });
  });

  return { drafts, errors };
};
