/**
 * 金额处理：领域内一律以“分”（整数 cents）计算，避免浮点误差。
 * 仅在与用户输入/展示交互时进行转换。
 */

const MAX_INTEGER_DIGITS = 9;

/** 解析用户输入的“元”字符串为分。非法或非正数返回 null。 */
export const parseAmountToCents = (input: string): number | null => {
  const s = input.trim().replace(/,/g, '');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
  const [yuan, fen = ''] = s.split('.');
  const cents = Number(yuan) * 100 + Number((fen + '00').slice(0, 2));
  return cents > 0 ? cents : null;
};

export interface FormatCentsOptions {
  /** 正数是否带 + 号 */
  signed?: boolean;
  /** 是否千分位（默认开启） */
  thousands?: boolean;
}

/** 将分格式化为“元”字符串，如 236800 -> "2,368.00" */
export const formatCents = (cents: number, options: FormatCentsOptions = {}): string => {
  const sign = cents < 0 ? '-' : options.signed ? '+' : '';
  const abs = Math.abs(cents);
  const yuan = Math.floor(abs / 100);
  const yuanStr =
    options.thousands === false ? String(yuan) : yuan.toLocaleString('en-US');
  const fen = String(abs % 100).padStart(2, '0');
  return `${sign}${yuanStr}.${fen}`;
};

/** 格式化为百分比文本，ratio 取值 0~1 */
export const formatRatio = (ratio: number): string =>
  `${Math.round(ratio * 100)}%`;
