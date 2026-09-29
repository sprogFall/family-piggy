import { moveItem } from './category-order';

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
