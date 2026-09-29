import { creatorLabel } from './attribution';

describe('creatorLabel', () => {
  it('记录人展示成员昵称（本人也不特殊处理）', () => {
    expect(creatorLabel('u1', '张三')).toBe('张三');
    expect(creatorLabel('u2', '李四')).toBe('李四');
  });

  it('昵称为空 / 纯空白时返回 null', () => {
    expect(creatorLabel('u2', null)).toBeNull();
    expect(creatorLabel('u2', '   ')).toBeNull();
  });

  it('createdBy 为空时返回 null', () => {
    expect(creatorLabel('', '张三')).toBeNull();
  });
});
