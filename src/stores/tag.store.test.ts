jest.mock('@/services/tag.service', () => ({
  tagService: {
    list: jest.fn(),
    ensureMany: jest.fn(),
    ensure: jest.fn(),
    remove: jest.fn(),
  },
}));

import { tagService } from '@/services/tag.service';
import type { Tag, TxKind } from '@/types/domain';

import { selectTags, useTagStore } from './tag.store';

const tagMock = tagService as jest.Mocked<typeof tagService>;

const tag = (id: string, kind: TxKind, name: string): Tag => ({
  id,
  ledgerId: 'l1',
  kind,
  name,
  createdAt: '2024-01-01T00:00:00Z',
});

describe('useTagStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTagStore.setState({ byLedger: {} });
  });

  it('load 按收支类型分组且各自按名称排序', async () => {
    tagMock.list.mockResolvedValue([
      tag('g2', 'expense', '夜宵'),
      tag('g1', 'expense', '午饭'),
      tag('g3', 'income', '月薪'),
    ]);

    await useTagStore.getState().load('l1');

    const state = useTagStore.getState();
    expect(selectTags(state, 'l1', 'expense').map((t) => t.name)).toEqual(['夜宵', '午饭'].sort());
    expect(selectTags(state, 'l1', 'income').map((t) => t.name)).toEqual(['月薪']);
  });

  it('ensure 复用返回的标签并合并到对应类型，不产生重复', async () => {
    tagMock.ensure.mockResolvedValue(tag('g1', 'expense', '午饭'));

    const first = await useTagStore.getState().ensure({ ledgerId: 'l1', kind: 'expense', name: '午饭' });
    await useTagStore.getState().ensure({ ledgerId: 'l1', kind: 'expense', name: '午饭' });

    expect(first.id).toBe('g1');
    expect(selectTags(useTagStore.getState(), 'l1', 'expense')).toHaveLength(1);
  });

  it('remove 从分组中剔除（其他类型不受影响）', async () => {
    tagMock.list.mockResolvedValue([tag('g1', 'expense', '午饭'), tag('g2', 'income', '月薪')]);
    await useTagStore.getState().load('l1');

    tagMock.remove.mockResolvedValue(undefined);
    await useTagStore.getState().remove('g1', 'l1');

    const state = useTagStore.getState();
    expect(selectTags(state, 'l1', 'expense')).toEqual([]);
    expect(selectTags(state, 'l1', 'income')).toHaveLength(1);
  });

  it('选择器在未加载时返回稳定引用（zustand v5 快照稳定性）', () => {
    const state = useTagStore.getState();
    expect(selectTags(state, 'l1', 'expense')).toBe(selectTags(state, 'l1', 'expense'));
    expect(selectTags(state, null, 'expense')).toBe(selectTags(state, null, 'expense'));
  });

  it('reset 清空所有账本标签', async () => {
    tagMock.list.mockResolvedValue([tag('g1', 'expense', '午饭')]);
    await useTagStore.getState().load('l1');
    useTagStore.getState().reset();
    expect(useTagStore.getState().byLedger).toEqual({});
  });
});
