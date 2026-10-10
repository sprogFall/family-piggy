jest.mock('@/services/category.service', () => ({
  categoryService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { categoryService } from '@/services/category.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Category } from '@/types/domain';

import { categorySnapshotKey, selectCategories, useCategoryStore } from './category.store';

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
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useAuthStore.setState({ status: 'signedIn', session: { user: { id: 'u1' } } as never, profile: null });
    useCategoryStore.setState({ ownerId: null, byLedger: {} });
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

  it('selectCategories 未加载/无账本时返回稳定引用（zustand v5 快照稳定性）', () => {
    const state = useCategoryStore.getState();
    expect(selectCategories(state, 'l1')).toBe(selectCategories(state, 'l1'));
    expect(selectCategories(state, null)).toBe(selectCategories(state, undefined));
  });

  it('load 后写入快照，hydrate 无需网络即可渲染', async () => {
    categoryMock.list.mockResolvedValue([category('c1')]);
    await useCategoryStore.getState().load('l1');
    expect(JSON.parse((await AsyncStorage.getItem(categorySnapshotKey('u1'))) as string)).toEqual({
      l1: [category('c1')],
    });

    useCategoryStore.setState({ ownerId: null, byLedger: {} });
    await useCategoryStore.getState().hydrate('u1');

    expect(selectCategories(useCategoryStore.getState(), 'l1')).toEqual([category('c1')]);
    expect(categoryMock.list).toHaveBeenCalledTimes(1);
  });

  it('快照按账号隔离：不会读到其他账号的分类', async () => {
    await AsyncStorage.setItem(categorySnapshotKey('u2'), JSON.stringify({ l9: [category('c9')] }));

    await useCategoryStore.getState().hydrate('u1');

    expect(useCategoryStore.getState().byLedger).toEqual({});
  });

  it('reset 清空分类并删除本账号快照', async () => {
    categoryMock.list.mockResolvedValue([category('c1')]);
    await useCategoryStore.getState().load('l1');

    useCategoryStore.getState().reset();
    await Promise.resolve();

    expect(useCategoryStore.getState().byLedger).toEqual({});
    expect(await AsyncStorage.getItem(categorySnapshotKey('u1'))).toBeNull();
  });
});
