jest.mock('@/services/tag.service', () => ({
  tagService: {
    list: jest.fn(),
    ensureMany: jest.fn(),
    ensure: jest.fn(),
    remove: jest.fn(),
  },
}));

import { tagService } from '@/services/tag.service';
import type { Tag } from '@/types/domain';

import { selectTags, useTagStore } from './tag.store';

const tagMock = tagService as jest.Mocked<typeof tagService>;

const tag = (id: string, categoryId: string, name: string): Tag => ({
  id,
  ledgerId: 'l1',
  categoryId,
  name,
  createdAt: '2024-01-01T00:00:00Z',
});

describe('useTagStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTagStore.setState({ byLedger: {} });
  });

  it('load 按分类分组且各自按名称排序', async () => {
    tagMock.list.mockResolvedValue([
      tag('g2', 'c1', '夜宵'),
      tag('g1', 'c1', '午饭'),
      tag('g3', 'c2', '打车'),
    ]);

    await useTagStore.getState().load('l1');

    const state = useTagStore.getState();
    expect(selectTags(state, 'l1', 'c1').map((t) => t.name)).toEqual(['夜宵', '午饭'].sort());
    expect(selectTags(state, 'l1', 'c2').map((t) => t.name)).toEqual(['打车']);
    expect(selectTags(state, 'l1', 'c9')).toEqual([]);
  });

  it('ensure 复用返回的标签并合并到对应分类，不产生重复', async () => {
    tagMock.ensure.mockResolvedValue(tag('g1', 'c1', '午饭'));

    const first = await useTagStore.getState().ensure({
      ledgerId: 'l1',
      categoryId: 'c1',
      name: '午饭',
    });
    await useTagStore.getState().ensure({ ledgerId: 'l1', categoryId: 'c1', name: '午饭' });

    expect(first.id).toBe('g1');
    expect(tagMock.ensure).toHaveBeenCalledWith({ ledgerId: 'l1', categoryId: 'c1', name: '午饭' });
    expect(selectTags(useTagStore.getState(), 'l1', 'c1')).toHaveLength(1);
  });

  it('remove 从所有分类中剔除该标签', async () => {
    tagMock.list.mockResolvedValue([tag('g1', 'c1', '午饭'), tag('g2', 'c2', '打车')]);
    await useTagStore.getState().load('l1');

    tagMock.remove.mockResolvedValue(undefined);
    await useTagStore.getState().remove('g1', 'l1');

    const state = useTagStore.getState();
    expect(selectTags(state, 'l1', 'c1')).toEqual([]);
    expect(selectTags(state, 'l1', 'c2')).toHaveLength(1);
  });

  it('选择器在未加载 / 未选分类时返回稳定引用（zustand v5 快照稳定性）', () => {
    const state = useTagStore.getState();
    expect(selectTags(state, 'l1', 'c1')).toBe(selectTags(state, 'l1', 'c1'));
    expect(selectTags(state, null, 'c1')).toBe(selectTags(state, null, 'c1'));
    expect(selectTags(state, 'l1', null)).toBe(selectTags(state, 'l1', null));
  });

  it('reset 清空所有账本标签', async () => {
    tagMock.list.mockResolvedValue([tag('g1', 'c1', '午饭')]);
    await useTagStore.getState().load('l1');
    useTagStore.getState().reset();
    expect(useTagStore.getState().byLedger).toEqual({});
  });
});
