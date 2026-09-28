import type { CurrencyCode } from './currency';
import {
  CURRENCY_CODES,
  CURRENCY_META,
  DEFAULT_CURRENCY,
  currencyLabel,
  currencySymbol,
  dominantCurrency,
  isCurrencyCode,
} from './currency';
import type { Transaction } from '@/types/domain';

const tx = (currency: CurrencyCode, occurredAt: string): Transaction => ({
  id: `${currency}-${occurredAt}`,
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 100,
  currency,
  tagId: null,
  occurredAt,
  createdBy: 'u1',
});

describe('currency', () => {
  it('默认币种是人民币，且每个币种都有符号与中文名', () => {
    expect(DEFAULT_CURRENCY).toBe('CNY');
    expect(CURRENCY_CODES).toContain('USD');
    for (const code of CURRENCY_CODES) {
      expect(CURRENCY_META[code].symbol).not.toBe('');
      expect(CURRENCY_META[code].label).not.toBe('');
    }
  });

  it('currencySymbol 支持 CNY/USD/EUR/HKD/GBP，未知币种回显代码', () => {
    expect(currencySymbol('CNY')).toBe('¥');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('HKD')).toBe('HK$');
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('XYZ')).toBe('XYZ');
  });

  it('currencyLabel 形如「人民币 CNY」', () => {
    expect(currencyLabel('USD')).toBe('美元 USD');
  });

  it('isCurrencyCode 只接受白名单币种', () => {
    expect(isCurrencyCode('EUR')).toBe(true);
    expect(isCurrencyCode('RMB')).toBe(false);
    expect(isCurrencyCode(null)).toBe(false);
    expect(isCurrencyCode(1)).toBe(false);
  });

  it('dominantCurrency：空列表回落 CNY，次数多者胜', () => {
    expect(dominantCurrency([])).toBe('CNY');
    expect(
      dominantCurrency([
        tx('USD', '2024-05-01T00:00:00.000Z'),
        tx('CNY', '2024-05-02T00:00:00.000Z'),
        tx('CNY', '2024-05-03T00:00:00.000Z'),
      ]),
    ).toBe('CNY');
  });

  it('dominantCurrency：次数相同时取最近一笔的币种', () => {
    expect(
      dominantCurrency([
        tx('USD', '2024-05-01T00:00:00.000Z'),
        tx('EUR', '2024-05-09T00:00:00.000Z'),
      ]),
    ).toBe('EUR');
  });

  it('dominantCurrency：库中的未知币种不污染结果', () => {
    expect(dominantCurrency([tx('XYZ' as CurrencyCode, '2024-05-01T00:00:00.000Z')])).toBe('CNY');
  });
});
