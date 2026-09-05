/**
 * 记账金额键盘输入的纯规则：所有按键行为在此定义并被测试覆盖。
 * 输入是“元”字符串，如 "12.53"。
 */

export const MAX_INTEGER_DIGITS = 9;
export const MAX_DECIMAL_DIGITS = 2;

export const AMOUNT_KEYS = [
  '7', '8', '9',
  '4', '5', '6',
  '1', '2', '3',
  '.', '0', 'backspace',
] as const;

export type AmountKey = (typeof AMOUNT_KEYS)[number];

/** 返回按键后的新值；非法按键返回原值 */
export const pressAmountKey = (current: string, key: AmountKey): string => {
  if (key === 'backspace') return current.slice(0, -1);

  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : current + '.';
  }

  if (!/^[0-9]$/.test(key)) return current;

  if (current.includes('.')) {
    const [, decPart] = current.split('.');
    if (decPart.length >= MAX_DECIMAL_DIGITS) return current;
    return current + key;
  }

  // 首个 0 被数字替换，避免 "05"
  if (current === '0') return key;
  if (current.length >= MAX_INTEGER_DIGITS) return current;
  return current + key;
};
