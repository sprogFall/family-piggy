jest.mock('@/services/category.service', () => ({
  categoryService: { create: jest.fn() },
}));

jest.mock('@/services/tag.service', () => ({
  normalizeTagName: (name: string) => name.trim().replace(/\s+/g, ' '),
  tagService: { ensureMany: jest.fn() },
}));

jest.mock('@/services/transaction.service', () => ({
  transactionService: { createMany: jest.fn() },
}));

import { supabase } from '@/lib/supabase';
import type { CsvDraft } from '@/domain/csv';
import { categoryService } from '@/services/category.service';
import { tagService } from '@/services/tag.service';
import { transactionService } from '@/services/transaction.service';
import { createQueryChain } from '@/test/supabase-mock';

import { importDrafts, parseCsvContent } from './import.service';

const fromMock = supabase.from as unknown as jest.Mock;
const categoryMock = categoryService as jest.Mocked<typeof categoryService>;
const tagMock = tagService as jest.Mocked<typeof tagService>;
const txMock = transactionService as jest.Mocked<typeof transactionService>;

const draft = (partial: Partial<CsvDraft>): CsvDraft => ({
  occurredAt: '2024-05-20T04:00:00.000Z',
  kind: 'expense',
  categoryName: '餐饮',
  amountCents: 1230,
  tagName: '',
  currency: 'CNY',
  ...partial,
});

describe('parseCsvContent', () => {
  it('解析合法 CSV（含标签列）', () => {
    const result = parseCsvContent(
      '\uFEFF日期,类型,分类,金额(元),标签,币种\r\n2024-05-20 14:30,支出,餐饮,12.30,午饭,USD\r\n',
    );
    expect(result.total).toBe(2);
    expect(result.errors).toEqual([]);
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]).toMatchObject({
      kind: 'expense',
      categoryName: '餐饮',
      amountCents: 1230,
      tagName: '午饭',
      currency: 'USD',
    });
  });

  it('错误行被收集', () => {
    const result = parseCsvContent('2024-05-20,支出,餐饮,abc,x');
    expect(result.drafts).toHaveLength(0);
    expect(result.errors[0].line).toBe(1);
  });
});

describe('importDrafts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fromMock.mockReturnValue(
      createQueryChain({
        data: [
          {
            id: 'c1',
            ledger_id: 'l1',
            name: '餐饮',
            icon: 'restaurant',
            kind: 'expense',
            sort_order: 1,
          },
        ],
        error: null,
      }),
    );
    categoryMock.create.mockResolvedValue({
      id: 'c-created',
      ledgerId: 'l1',
      name: '工资',
      icon: 'ellipsis-horizontal',
      kind: 'income',
      sortOrder: 2,
    });
    tagMock.ensureMany.mockImplementation(async (_ledgerId, categoryId, names) =>
      names.map((name, index) => ({
        id: `${categoryId}-g${index}`,
        ledgerId: 'l1',
        categoryId,
        name,
        createdAt: '2024-01-01T00:00:00Z',
      })),
    );
    txMock.createMany.mockResolvedValue(undefined);
  });

  it('标签按分类复用（同名标签在不同分类下相互独立），并随流水写入 tag_id', async () => {
    const count = await importDrafts(
      'l1',
      [draft({ tagName: '午饭' }), draft({ tagName: '午饭', kind: 'income', categoryName: '工资' })],
      'u1',
    );

    expect(count).toBe(2);
    // 餐饮 -> c1；工资分类缺失被新建 -> c-created
    expect(tagMock.ensureMany).toHaveBeenCalledWith('l1', 'c1', ['午饭']);
    expect(tagMock.ensureMany).toHaveBeenCalledWith('l1', 'c-created', ['午饭']);
    expect(categoryMock.create).toHaveBeenCalledTimes(1); // 「工资」分类缺失 → 自动创建
    expect(txMock.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ tagId: 'c1-g0', categoryId: 'c1', currency: 'CNY' }),
      expect.objectContaining({ tagId: 'c-created-g0', categoryId: 'c-created' }),
    ]);
  });

  it('无标签的流水不请求标签且 tag_id 为 null；空草稿不写库', async () => {
    await importDrafts('l1', [draft({ tagName: '  ' })], 'u1');

    expect(tagMock.ensureMany).not.toHaveBeenCalled();
    expect(txMock.createMany).toHaveBeenCalledWith([expect.objectContaining({ tagId: null })]);
    expect(await importDrafts('l1', [], 'u1')).toBe(0);
  });

  it('导入时带上每行的币种', async () => {
    await importDrafts('l1', [draft({ tagName: '', currency: 'USD' })], 'u1');

    expect(txMock.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ currency: 'USD' }),
    ]);
  });
});
