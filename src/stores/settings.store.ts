import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from '@/domain/currency';
import { DEFAULT_FONT_SCALE, isFontScaleKey, type FontScaleKey } from '@/theme/font-scale';

const FONT_SCALE_STORAGE_KEY = 'settings:fontScale';
const CURRENCY_STORAGE_KEY = 'settings:currency';
const AMOUNTS_HIDDEN_STORAGE_KEY = 'settings:amountsHidden';

/** 金额隐藏开关是设备级偏好（不落库）：只在本机保存 '1' / '0' */
const HIDDEN_FLAG = { on: '1', off: '0' } as const;

const parseHiddenFlag = (value: string | null): boolean => value === HIDDEN_FLAG.on;

interface SettingsState {
  /** 全局字号档位（标准 = 设计基准） */
  fontScale: FontScaleKey;
  /** 上次记账使用的币种：下次记账默认选中，首次启动为 CNY */
  currency: CurrencyCode;
  /** 概览页汇总卡是否隐藏金额：本地持久化，重启 App 依然生效 */
  amountsHidden: boolean;
  /** 启动时读取本地设置；读取失败回落到默认值 */
  hydrate: () => Promise<void>;
  setFontScale: (key: FontScaleKey) => void;
  setCurrency: (code: CurrencyCode) => void;
  setAmountsHidden: (hidden: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  fontScale: DEFAULT_FONT_SCALE,
  currency: DEFAULT_CURRENCY,
  amountsHidden: false,

  hydrate: async () => {
    try {
      const [storedScale, storedCurrency, storedAmountsHidden] = await Promise.all([
        AsyncStorage.getItem(FONT_SCALE_STORAGE_KEY),
        AsyncStorage.getItem(CURRENCY_STORAGE_KEY),
        AsyncStorage.getItem(AMOUNTS_HIDDEN_STORAGE_KEY),
      ]);
      const fontScale = isFontScaleKey(storedScale) ? storedScale : DEFAULT_FONT_SCALE;
      const currency = isCurrencyCode(storedCurrency) ? storedCurrency : DEFAULT_CURRENCY;
      set({ fontScale, currency, amountsHidden: parseHiddenFlag(storedAmountsHidden) });
    } catch {
      set({ fontScale: DEFAULT_FONT_SCALE, currency: DEFAULT_CURRENCY, amountsHidden: false });
    }
  },

  setFontScale: (key) => {
    set({ fontScale: key });
    void AsyncStorage.setItem(FONT_SCALE_STORAGE_KEY, key).catch(() => undefined);
  },

  setCurrency: (code) => {
    set({ currency: code });
    void AsyncStorage.setItem(CURRENCY_STORAGE_KEY, code).catch(() => undefined);
  },

  setAmountsHidden: (hidden) => {
    set({ amountsHidden: hidden });
    void AsyncStorage.setItem(
      AMOUNTS_HIDDEN_STORAGE_KEY,
      hidden ? HIDDEN_FLAG.on : HIDDEN_FLAG.off,
    ).catch(() => undefined);
  },
}));
