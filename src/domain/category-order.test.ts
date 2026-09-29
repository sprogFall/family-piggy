import {
  isSameCategoryOrder,
  mergeCategoryOrder,
  moveItem,
} from './category-order';

describe('moveItem', () => {
  it('将元素移动到目标位置', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('相同位置或越界返回原顺序副本', () => {
    const source = ['a', 'b'];
    expect(moveItem(source, 1, 1)).toEqual(source);
    expect(moveItem(source, -1, 1)).toEqual(source);
    expect(moveItem(source, 5, 0)).toEqual(source);
  });
});

describe('mergeCategoryOrder', () => {
  it('保留草稿顺序，忽略已删除分类，把新增分类排到末尾', () => {
    expect(mergeCategoryOrder(['a', 'b', 'c'], ['b', 'a'])).toEqual(['b', 'a', 'c']);
    expect(mergeCategoryOrder(['a', 'b', 'c'], ['c', 'x', 'a'])).toEqual(['c', 'a', 'b']);
  });
});

describe('isSameCategoryOrder', () => {
  it('顺序完全一致返回 true，否则 false', () => {
    expect(isSameCategoryOrder(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(isSameCategoryOrder(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(isSameCategoryOrder(['a'], ['a', 'b'])).toBe(false);
  });
});
