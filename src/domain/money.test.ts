import { formatCents, formatRatio, parseAmountToCents } from './money';

describe('parseAmountToCents', () => {
  it('解析整数元', () => {
    expect(parseAmountToCents('2368')).toBe(236800);
  });

  it('解析一位小数', () => {
    expect(parseAmountToCents('12.3')).toBe(1230);
  });

  it('解析两位小数', () => {
    expect(parseAmountToCents('0.05')).toBe(5);
  });

  it('容忍千分位逗号与首尾空格', () => {
    expect(parseAmountToCents(' 3,800.00 ')).toBe(380000);
  });

  it('拒绝空串/点号/负数/三位小数/非法字符', () => {
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('.')).toBeNull();
    expect(parseAmountToCents('0')).toBeNull();
    expect(parseAmountToCents('0.00')).toBeNull();
    expect(parseAmountToCents('-5')).toBeNull();
    expect(parseAmountToCents('12.345')).toBeNull();
    expect(parseAmountToCents('abc')).toBeNull();
    expect(parseAmountToCents('1.2.3')).toBeNull();
  });

  it('超过 9 位整数拒绝', () => {
    expect(parseAmountToCents('1234567890')).toBeNull();
    expect(parseAmountToCents('123456789')).not.toBeNull();
  });
});

describe('formatCents', () => {
  it('默认千分位两位小数', () => {
    expect(formatCents(236800)).toBe('2,368.00');
    expect(formatCents(5)).toBe('0.05');
    expect(formatCents(0)).toBe('0.00');
  });

  it('负数带负号，可关千分位', () => {
    expect(formatCents(-380000)).toBe('-3,800.00');
    expect(formatCents(380000, { thousands: false })).toBe('3800.00');
  });

  it('signed 为正数加 +', () => {
    expect(formatCents(380000, { signed: true })).toBe('+3,800.00');
    expect(formatCents(-380000, { signed: true })).toBe('-3,800.00');
  });
});

describe('formatRatio', () => {
  it('四舍五入到整数百分比', () => {
    expect(formatRatio(0.354)).toBe('35%');
    expect(formatRatio(1)).toBe('100%');
    expect(formatRatio(0)).toBe('0%');
  });
});
