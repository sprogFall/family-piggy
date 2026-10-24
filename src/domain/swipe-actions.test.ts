import {
  clampOffset,
  EDIT_ACTIONS_WIDTH,
  offsetOfSide,
  REIMBURSE_ACTION_WIDTH,
  resolveSwipeSettle,
} from './swipe-actions';

describe('clampOffset', () => {
  it('左不越过操作区、右不越过报销区', () => {
    expect(clampOffset(-999, true)).toBe(-EDIT_ACTIONS_WIDTH);
    expect(clampOffset(999, true)).toBe(REIMBURSE_ACTION_WIDTH);
    expect(clampOffset(30, true)).toBe(30);
  });

  it('不可报销时右侧锁死，仍允许左滑', () => {
    expect(clampOffset(999, false)).toBe(0);
    expect(clampOffset(-999, false)).toBe(-EDIT_ACTIONS_WIDTH);
  });
});

describe('offsetOfSide', () => {
  it('按展开侧给出静止位移', () => {
    expect(offsetOfSide(null, true)).toBe(0);
    expect(offsetOfSide('left', true)).toBe(-EDIT_ACTIONS_WIDTH);
    expect(offsetOfSide('right', true)).toBe(REIMBURSE_ACTION_WIDTH);
  });

  it('不可报销时右侧位移为 0', () => {
    expect(offsetOfSide('right', false)).toBe(0);
  });
});

describe('resolveSwipeSettle', () => {
  it('右滑越过四成宽度即触发报销并收起', () => {
    expect(
      resolveSwipeSettle({
        gesture: { dx: REIMBURSE_ACTION_WIDTH * 0.5, vx: 0 },
        startSide: null,
        canReimburse: true,
      }),
    ).toEqual({ side: null, reimburse: true });
  });

  it('右滑未达阈值时不报销且收起', () => {
    expect(
      resolveSwipeSettle({
        gesture: { dx: 20, vx: 0 },
        startSide: null,
        canReimburse: true,
      }),
    ).toEqual({ side: null, reimburse: false });
  });

  it('不可报销时右滑不触发报销', () => {
    expect(
      resolveSwipeSettle({
        gesture: { dx: 200, vx: 5 },
        startSide: null,
        canReimburse: false,
      }),
    ).toEqual({ side: null, reimburse: false });
  });

  it('左滑超过比例阈值展开编辑 / 删除', () => {
    expect(
      resolveSwipeSettle({
        gesture: { dx: -EDIT_ACTIONS_WIDTH * 0.5, vx: 0 },
        startSide: null,
        canReimburse: true,
      }),
    ).toEqual({ side: 'left', reimburse: false });
  });

  it('左滑距离不足但快速甩动也展开', () => {
    expect(
      resolveSwipeSettle({
        gesture: { dx: -10, vx: -0.5 },
        startSide: null,
        canReimburse: true,
      }),
    ).toEqual({ side: 'left', reimburse: false });
  });

  it('微小位移松手后收起', () => {
    expect(
      resolveSwipeSettle({
        gesture: { dx: 5, vx: 0 },
        startSide: null,
        canReimburse: true,
      }),
    ).toEqual({ side: null, reimburse: false });
  });

  it('已左滑展开时右拖只收起面板，不误触发报销', () => {
    expect(
      resolveSwipeSettle({
        gesture: { dx: EDIT_ACTIONS_WIDTH + 50, vx: 0 },
        startSide: 'left',
        canReimburse: true,
      }),
    ).toEqual({ side: null, reimburse: false });
  });

  it('已右滑展开时继续右拖不重复触发报销', () => {
    expect(
      resolveSwipeSettle({
        gesture: { dx: 10, vx: 0 },
        startSide: 'right',
        canReimburse: true,
      }),
    ).toEqual({ side: null, reimburse: false });
  });
});