import { read, utils } from 'xlsx';

import { csvToDrafts, parseCsv, type CsvDraft } from '@/domain/csv';
import { categoryService } from '@/services/category.service';
import { normalizeTagName, tagService } from '@/services/tag.service';
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

export interface ImportDraftsOptions {
  /** 没有记录人或映射不到时的兜底记录人（通常为当前登录用户） */
  defaultCreatedBy: string;
  /** 来源账单里的记录人名称 -> App 用户 ID */
  recorderUserIds?: Record<string, string>;
}

/** 将来源记录人解析为 App 用户 ID；空记录人或未映射时回退到默认记录人 */
export const resolveCreatedBy = (
  recorderName: string,
  options: ImportDraftsOptions,
): string => {
  const key = recorderName.trim();
  if (key === '') return options.defaultCreatedBy;
  const mapped = options.recorderUserIds?.[key];
  return mapped ? mapped : options.defaultCreatedBy;
};

/** 导入草稿：缺失分类自动创建，标签按「账本 + 分类 + 名称」复用，批量写入流水，返回导入条数 */
export const importDrafts = async (
  ledgerId: string,
  drafts: CsvDraft[],
  options: ImportDraftsOptions,
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

  // 分类可能在上一步刚创建，这里一次性解析出每行最终归属的分类
  const rows = drafts.map((draft) => ({
    draft,
    categoryId: idByKey.get(`${draft.kind}:${draft.categoryName}`)!.id,
  }));

  const tagIdByKey = await ensureDraftTags(
    ledgerId,
    rows.map(({ draft, categoryId }) => ({ categoryId, tagName: draft.tagName })),
  );

  await transactionService.createMany(
    rows.map(({ draft, categoryId }) => ({
      ledgerId,
      categoryId,
      kind: draft.kind,
      amount: draft.amountCents,
      currency: draft.currency,
      tagId: tagIdByKey.get(`${categoryId}:${normalizeTagName(draft.tagName)}`) ?? null,
      note: draft.note,
      attributes: { reimbursement: draft.reimbursement },
      images: [],
      occurredAt: draft.occurredAt,
      createdBy: resolveCreatedBy(draft.recorderName, options),
    })),
  );
  return drafts.length;
};

/** 导入行里的标签引用（标签隶属于分类，先按分类分组） */
interface DraftTagRef {
  categoryId: string;
  tagName: string;
}

/** 按分类批量创建/复用标签，返回 `${categoryId}:${name}` -> 标签 ID */
const ensureDraftTags = async (
  ledgerId: string,
  refs: DraftTagRef[],
): Promise<Map<string, string>> => {
  const namesByCategory = new Map<string, string[]>();
  for (const ref of refs) {
    if (normalizeTagName(ref.tagName) === '') continue;
    const names = namesByCategory.get(ref.categoryId) ?? [];
    names.push(ref.tagName);
    namesByCategory.set(ref.categoryId, names);
  }

  const idByKey = new Map<string, string>();
  for (const [categoryId, names] of namesByCategory) {
    const tags = await tagService.ensureMany(ledgerId, categoryId, names);
    for (const tag of tags) idByKey.set(`${tag.categoryId}:${tag.name}`, tag.id);
  }
  return idByKey;
};
