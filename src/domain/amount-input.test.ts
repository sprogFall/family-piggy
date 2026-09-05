import { pressAmountKey } from './amount-input';

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
});
