import { budgetProgress } from './budget';

describe('budgetProgress', () => {
  it('未设置预算（<=0）返回零进度', () => {
    expect(budgetProgress(10000, 0)).toEqual({
      ratio: 0,
      remainingCents: 0,
      isOver: false,
    });
  });

  it('未超支：比例与剩余为正', () => {
    expect(budgetProgress(2500, 10000)).toEqual({
      ratio: 0.25,
      remainingCents: 7500,
      isOver: false,
    });
  });

  it('刚好用完', () => {
    expect(budgetProgress(10000, 10000)).toEqual({
      ratio: 1,
      remainingCents: 0,
      isOver: false,
    });
  });

  it('超支：比例封顶 1，剩余为负', () => {
    expect(budgetProgress(12000, 10000)).toEqual({
      ratio: 1,
      remainingCents: -2000,
      isOver: true,
    });
  });
});
