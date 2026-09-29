import {
  evaluateAmountExpression,
  pressAmountKey,
} from './amount-input';

describe('pressAmountKey', () => {
  it('空串输入数字', () => {
    expect(pressAmountKey('', '5')).toBe('5');
  });

  it('前导 0 被替换', () => {
    expect(pressAmountKey('0', '5')).toBe('5');
    expect(pressAmountKey('0', '0')).toBe('0');
  });

  it('整数位连续输入', () => {
    expect(pressAmountKey('12', '3')).toBe('123');
  });

  it('整数位达到 9 位后不再增长', () => {
    const nine = '123456789';
    expect(pressAmountKey(nine, '1')).toBe(nine);
  });

  it('小数点：空串补 0，已含小数点忽略', () => {
    expect(pressAmountKey('', '.')).toBe('0.');
    expect(pressAmountKey('12', '.')).toBe('12.');
    expect(pressAmountKey('12.', '.')).toBe('12.');
  });

  it('小数位最多 2 位', () => {
    expect(pressAmountKey('12.5', '3')).toBe('12.53');
    expect(pressAmountKey('12.53', '1')).toBe('12.53');
  });

  it('退格：逐位删除，空串安全', () => {
    expect(pressAmountKey('12.5', 'backspace')).toBe('12.');
    expect(pressAmountKey('12.', 'backspace')).toBe('12');
    expect(pressAmountKey('', 'backspace')).toBe('');
  });

  it('运算符连接下一个操作数，并独立套用金额规则', () => {
    expect(pressAmountKey('12', '+')).toBe('12+');
    expect(pressAmountKey('12+', '5')).toBe('12+5');
    expect(pressAmountKey('12+', '.')).toBe('12+0.');
    expect(pressAmountKey('12+0.', '5')).toBe('12+0.5');
    expect(pressAmountKey('12+5', '×')).toBe('12+5×');
  });

  it('连续或空表达式上的运算符被归一化/拒绝', () => {
    expect(pressAmountKey('', '+')).toBe('');
    expect(pressAmountKey('12+', '-')).toBe('12-');
    expect(pressAmountKey('12.', '÷')).toBe('12÷');
    expect(pressAmountKey('12+', '+')).toBe('12+');
  });

  it('表达式长度达到上限后不再增长（退格除外）', () => {
    const full = '1'.repeat(40);
    expect(pressAmountKey(full, '2')).toBe(full);
    expect(pressAmountKey(full, 'backspace')).toHaveLength(39);
  });
});

describe('evaluateAmountExpression', () => {
  it('单笔金额原样求值到两位小数', () => {
    expect(evaluateAmountExpression('12.5')).toBe('12.50');
    expect(evaluateAmountExpression('0.05')).toBe('0.05');
    expect(evaluateAmountExpression('12.')).toBe('12.00');
  });

  it('支持加减乘除并遵守先乘除后加减', () => {
    expect(evaluateAmountExpression('12+5')).toBe('17.00');
    expect(evaluateAmountExpression('12+5×2')).toBe('22.00');
    expect(evaluateAmountExpression('20-5×2')).toBe('10.00');
    expect(evaluateAmountExpression('10÷4')).toBe('2.50');
  });

  it('除法结果四舍五入到分', () => {
    expect(evaluateAmountExpression('10÷3')).toBe('3.33');
  });

  it('拒绝空表达式、连续运算符、除零与非法字符', () => {
    expect(evaluateAmountExpression('')).toBeNull();
    expect(evaluateAmountExpression('12+')).toBeNull();
    expect(evaluateAmountExpression('12++5')).toBeNull();
    expect(evaluateAmountExpression('10÷0')).toBeNull();
    expect(evaluateAmountExpression('abc')).toBeNull();
  });

  it('超出金额范围返回空，负数结果保留给提交层校验', () => {
    expect(evaluateAmountExpression('999999999+1')).toBeNull();
    expect(evaluateAmountExpression('5-10')).toBe('-5.00');
  });
});
