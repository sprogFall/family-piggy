jest.mock('@/services/category.service', () => ({
  categoryService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    maxSortOrder: jest.fn(),
  },
}));

import { categoryService } from '@/services/category.service';
import type { Category } from '@/types/domain';

import { selectCategories, useCategoryStore } from './category.store';

const categoryMock = categoryService as jest.Mocked<typeof categoryService>;

const category = (id: string, overrides: Partial<Category> = {}): Category => ({
  id,
  ledgerId: 'l1',
  name: `分类${id}`,
  icon: 'ellipsis-horizontal',
  kind: 'expense',
  sortOrder: 1,
  ...overrides,
});

describe('useCategoryStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCategoryStore.setState({ byLedger: {} });
  });

  it('load 存入对应账本', async () => {
    categoryMock.list.mockResolvedValue([category('c1'), category('c2')]);
    await useCategoryStore.getState().load('l1');
    expect(selectCategories(useCategoryStore.getState(), 'l1')).toHaveLength(2);
  });

  it('create 追加并按 kind+sortOrder 排序', async () => {
    categoryMock.list.mockResolvedValue([category('c1', { sortOrder: 1 })]);
    await useCategoryStore.getState().load('l1');
    categoryMock.create.mockResolvedValue(category('c9', { sortOrder: 0 }));

    await useCategoryStore.getState().create({
      ledgerId: 'l1',
      name: '分类c9',
      icon: 'star',
      kind: 'expense',
      sortOrder: 1,
    });

    const list = selectCategories(useCategoryStore.getState(), 'l1');
    expect(list.map((c) => c.id)).toEqual(['c9', 'c1']);
  });

  it('update 局部更新', async () => {
    categoryMock.list.mockResolvedValue([category('c1')]);
    await useCategoryStore.getState().load('l1');
    await useCategoryStore.getState().update('c1', 'l1', { name: '餐饮' });
    expect(selectCategories(useCategoryStore.getState(), 'l1')[0].name).toBe('餐饮');
  });

  it('remove 移除', async () => {
    categoryMock.list.mockResolvedValue([category('c1'), category('c2')]);
    await useCategoryStore.getState().load('l1');
    await useCategoryStore.getState().remove('c1', 'l1');
    expect(selectCategories(useCategoryStore.getState(), 'l1').map((c) => c.id)).toEqual(['c2']);
  });
});
