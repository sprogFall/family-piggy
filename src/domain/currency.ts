/**
 * 币种：记账时必选，默认人民币（CNY）。
 *
 * 金额在库中始终以「该币种的最小单位」整数存储（人民币/美元为分，日元为円），
 * 这里的元数据只负责展示（符号 / 名称），不做汇率换算。
 */

import type { Transaction } from '@/types/domain';

export const CURRENCY_CODES = ['CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP'] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** 默认币种：未选择时一律按人民币记账 */
export const DEFAULT_CURRENCY: CurrencyCode = 'CNY';

export interface CurrencyMeta {
  /** 金额前缀符号 */
  symbol: string;
  /** 中文名称 */
  label: string;
}

export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  CNY: { symbol: '¥', label: '人民币' },
  USD: { symbol: '$', label: '美元' },
  EUR: { symbol: '€', label: '欧元' },
  JPY: { symbol: '¥', label: '日元' },
  HKD: { symbol: 'HK$', label: '港币' },
  GBP: { symbol: '£', label: '英镑' },
};

export const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === 'string' && (CURRENCY_CODES as readonly string[]).includes(value);

/** 展示用符号；未知币种直接回显代码，避免出现空白 */
export const currencySymbol = (code: string): string =>
  isCurrencyCode(code) ? CURRENCY_META[code].symbol : code;

/** 选择器用文案，如 "人民币 CNY" */
export const currencyLabel = (code: CurrencyCode): string =>
  `${CURRENCY_META[code].label} ${code}`;

/**
 * 一组流水的主币种：出现次数最多的币种，次数相同取最近一笔发生的币种。
 * 用于「首页 / 统计 / 账单」这类需要单一币种汇总的展示，避免不同币种直接相加。
 */
export const dominantCurrency = (transactions: Transaction[]): CurrencyCode => {
  if (transactions.length === 0) return DEFAULT_CURRENCY;
  const stats = new Map<string, { count: number; latest: string }>();
  for (const tx of transactions) {
    const current = stats.get(tx.currency);
    if (!current) {
      stats.set(tx.currency, { count: 1, latest: tx.occurredAt });
      continue;
    }
    current.count += 1;
    if (tx.occurredAt > current.latest) current.latest = tx.occurredAt;
  }
  let best: { code: string; count: number; latest: string } | null = null;
  for (const [code, stat] of stats) {
    if (
      !best ||
      stat.count > best.count ||
      (stat.count === best.count && stat.latest > best.latest)
    ) {
      best = { code, ...stat };
    }
  }
  return isCurrencyCode(best?.code) ? best.code : DEFAULT_CURRENCY;
};
