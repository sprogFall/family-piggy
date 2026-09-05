import { read, utils } from 'xlsx';

import { csvToDrafts, parseCsv, type CsvDraft } from '@/domain/csv';
import { categoryService } from '@/services/category.service';
import { transactionService } from '@/services/transaction.service';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/domain';
import { toCategory, type CategoryRow } from '@/types/db';

export interface ImportParseResult {
  drafts: CsvDraft[];
  errors: { line: number; message: string }[];
  total: number;
}

export const parseCsvContent = (content: string): ImportParseResult => {
  const rows = parseCsv(content);
  const { drafts, errors } = csvToDrafts(rows);
  return { drafts, errors, total: rows.length };
};

export const parseXlsxBase64 = (base64: string): ImportParseResult => {
  const workbook = read(base64, { type: 'base64' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { drafts: [], errors: [{ line: 1, message: '文件中没有工作表' }], total: 0 };
  const rows = utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
  }) as unknown[][];
  const stringRows = rows.map((row) => row.map((cell) => String(cell)));
  const { drafts, errors } = csvToDrafts(stringRows);
  return { drafts, errors, total: stringRows.length };
};

/** 导入草稿：缺失分类自动创建，批量写入流水，返回导入条数 */
export const importDrafts = async (
  ledgerId: string,
  drafts: CsvDraft[],
  userId: string,
): Promise<number> => {
  if (drafts.length === 0) return 0;

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('ledger_id', ledgerId);
  if (error) throw new Error('加载分类失败');
  const existing = (data as CategoryRow[]).map(toCategory);

  const idByKey = new Map<string, Category>(
    existing.map((category) => [`${category.kind}:${category.name}`, category]),
  );
  let nextSort = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0);

  for (const draft of drafts) {
    const key = `${draft.kind}:${draft.categoryName}`;
    if (!idByKey.has(key)) {
      nextSort += 1;
      const created = await categoryService.create({
        ledgerId,
        name: draft.categoryName,
        icon: 'ellipsis-horizontal',
        kind: draft.kind,
        sortOrder: nextSort,
      });
      idByKey.set(key, created);
    }
  }

  await transactionService.createMany(
    drafts.map((draft) => ({
      ledgerId,
      categoryId: idByKey.get(`${draft.kind}:${draft.categoryName}`)!.id,
      kind: draft.kind,
      amount: draft.amountCents,
      note: draft.note === '' ? null : draft.note,
      occurredAt: draft.occurredAt,
      createdBy: userId,
    })),
  );
  return drafts.length;
};
