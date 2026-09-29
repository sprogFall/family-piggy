/**
 * 记账金额键盘与表达式的纯规则：所有按键行为、四则运算求值都在此定义并被测试覆盖。
 * 输入是“元”表达式字符串，如 "12.53" 或 "12.53+5×2"。
 */

export const MAX_INTEGER_DIGITS = 9;
export const MAX_DECIMAL_DIGITS = 2;
export const MAX_AMOUNT_EXPRESSION_LENGTH = 40;

export const AMOUNT_OPERATORS = ['+', '-', '×', '÷'] as const;
export type AmountOperator = (typeof AMOUNT_OPERATORS)[number];

export const AMOUNT_KEYS = [
  '7', '8', '9',
  '4', '5', '6',
  '1', '2', '3',
  '.', '0', 'backspace',
  ...AMOUNT_OPERATORS,
] as const;

export type AmountKey = (typeof AMOUNT_KEYS)[number];

const isAmountOperator = (value: string): value is AmountOperator =>
  (AMOUNT_OPERATORS as readonly string[]).includes(value);

/** 当前输入停留在哪个操作数（最后一个运算符之后的部分） */
const currentOperandOf = (expression: string): string => {
  for (let index = expression.length - 1; index >= 0; index -= 1) {
    if (isAmountOperator(expression[index])) return expression.slice(index + 1);
  }
  return expression;
};

/** 返回按键后的新表达式；非法按键返回原值 */
export const pressAmountKey = (current: string, key: AmountKey): string => {
  if (key !== 'backspace' && current.length >= MAX_AMOUNT_EXPRESSION_LENGTH) return current;
  if (key === 'backspace') return current.slice(0, -1);

  if (isAmountOperator(key)) {
    if (current === '') return current;
    const last = current.slice(-1);
    // 连续按运算符时替换最后一个，避免出现 "12++"
    if (isAmountOperator(last) || last === '.') return `${current.slice(0, -1)}${key}`;
    return current + key;
  }

  const operand = currentOperandOf(current);
  if (key === '.') {
    if (operand.includes('.')) return current;
    return current + (operand === '' ? '0.' : '.');
  }

  if (operand.includes('.')) {
    const [, decimal] = operand.split('.');
    if (decimal.length >= MAX_DECIMAL_DIGITS) return current;
    return current + key;
  }

  // 操作数首个 0 被数字替换，避免 "05"
  if (operand === '0') return `${current.slice(0, -1)}${key}`;
  if (operand.length >= MAX_INTEGER_DIGITS) return current;
  return current + key;
};

const OPERATOR_PRECEDENCE: Record<AmountOperator, number> = {
  '+': 1,
  '-': 1,
  '×': 2,
  '÷': 2,
};

type ExpressionToken = number | AmountOperator;

const isDigitOrDot = (value: string): boolean => /^[0-9.]$/.test(value);

const tokenize = (expression: string): ExpressionToken[] | null => {
  const tokens: ExpressionToken[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];
    if (isAmountOperator(char)) {
      tokens.push(char);
      index += 1;
      continue;
    }
    if (!isDigitOrDot(char)) return null;

    let end = index;
    while (end < expression.length && isDigitOrDot(expression[end])) end += 1;
    const rawNumber = expression.slice(index, end);
    if (!/^\d{1,9}(\.\d{0,2})?$/.test(rawNumber)) return null;
    tokens.push(Number(rawNumber));
    index = end;
  }

  if (tokens.length === 0) return null;
  // 必须严格满足「数字 (运算符 数字)*」，不允许连续数字或连续运算符
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex];
    const expectedNumber = tokenIndex % 2 === 0;
    if (expectedNumber && typeof token !== 'number') return null;
    if (!expectedNumber && typeof token !== 'string') return null;
  }
  return tokens;
};

const applyOperation = (
  values: number[],
  operators: AmountOperator[],
): boolean => {
  const operator = operators.pop();
  const right = values.pop();
  const left = values.pop();
  if (operator === undefined || left === undefined || right === undefined) return false;

  switch (operator) {
    case '+':
      values.push(left + right);
      return true;
    case '-':
      values.push(left - right);
      return true;
    case '×':
      values.push(left * right);
      return true;
    case '÷':
      if (right === 0) return false;
      values.push(left / right);
      return true;
  }
};


/** 把求值结果里的尾随 0 去掉，用于「大号结果」展示；例如 49.00 -> 49、12.50 -> 12.5。 */
export const formatEvaluatedAmount = (value: string): string => {
  if (!value.includes('.')) return value;
  const trimmed = value.replace(/0+$/, '');
  return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
};

const formatCentsResult = (value: number): string | null => {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round((value + Number.EPSILON) * 100);
  // 与金额解析保持一致：整数元最多 9 位
  if (Math.abs(rounded) > 99_999_999_999) return null;
  const sign = rounded < 0 ? '-' : '';
  const absolute = Math.abs(rounded);
  const yuan = Math.floor(absolute / 100);
  const fen = String(absolute % 100).padStart(2, '0');
  return `${sign}${yuan}.${fen}`;
};

/**
 * 计算金额表达式，按标准优先级（先乘除后加减）求值，结果保留两位小数。
 * 非法表达式、除以 0、超出金额范围时返回 null。
 */
export const evaluateAmountExpression = (expression: string): string | null => {
  const trimmed = expression.trim();
  if (trimmed === '' || trimmed.length > MAX_AMOUNT_EXPRESSION_LENGTH) return null;

  const tokens = tokenize(trimmed);
  if (!tokens) return null;

  const values: number[] = [];
  const operators: AmountOperator[] = [];

  for (const token of tokens) {
    if (typeof token === 'number') {
      values.push(token);
      continue;
    }

    while (
      operators.length > 0 &&
      OPERATOR_PRECEDENCE[operators[operators.length - 1]] >= OPERATOR_PRECEDENCE[token]
    ) {
      if (!applyOperation(values, operators)) return null;
    }
    operators.push(token);
  }

  while (operators.length > 0) {
    if (!applyOperation(values, operators)) return null;
  }

  if (values.length !== 1) return null;
  return formatCentsResult(values[0]);
};
