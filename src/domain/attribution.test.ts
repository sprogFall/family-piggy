import { SELF_LABEL, creatorLabel } from './attribution';

describe('creatorLabel', () => {
  it('本人记录显示「我」', () => {
    expect(creatorLabel('u1', 'u1', '张三')).toBe(SELF_LABEL);
  });

  it('他人记录显示成员昵称', () => {
    expect(creatorLabel('u2', 'u1', '李四')).toBe('李四');
  });

  it('未登录（无 viewerId）时按昵称展示，取不到则返回 null', () => {
    expect(creatorLabel('u2', null, '李四')).toBe('李四');
    expect(creatorLabel('u2', null, undefined)).toBeNull();
  });

  it('昵称为空/纯空白时返回 null', () => {
    expect(creatorLabel('u2', 'u1', null)).toBeNull();
    expect(creatorLabel('u2', 'u1', '   ')).toBeNull();
  });

  it('createdBy 为空时返回 null', () => {
    expect(creatorLabel('', 'u1', '张三')).toBeNull();
  });
});
