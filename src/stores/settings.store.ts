import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from '@/domain/currency';
import {
  DEFAULT_FONT_SCALE,
  isFontScaleKey,
  setActiveFontScale,
  type FontScaleKey,
} from '@/theme/font-scale';

const FONT_SCALE_STORAGE_KEY = 'settings:fontScale';
const CURRENCY_STORAGE_KEY = 'settings:currency';

interface SettingsState {
  /** 全局字号档位（标准 = 设计基准） */
  fontScale: FontScaleKey;
  /** 上次记账使用的币种：下次记账默认选中，首次启动为 CNY */
  currency: CurrencyCode;
  /** 启动时读取本地设置；读取失败回落到默认值 */
  hydrate: () => Promise<void>;
  setFontScale: (key: FontScaleKey) => void;
  setCurrency: (code: CurrencyCode) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  fontScale: DEFAULT_FONT_SCALE,
  currency: DEFAULT_CURRENCY,

  hydrate: async () => {
    try {
      const [storedScale, storedCurrency] = await Promise.all([
        AsyncStorage.getItem(FONT_SCALE_STORAGE_KEY),
        AsyncStorage.getItem(CURRENCY_STORAGE_KEY),
      ]);
      const fontScale = isFontScaleKey(storedScale) ? storedScale : DEFAULT_FONT_SCALE;
      const currency = isCurrencyCode(storedCurrency) ? storedCurrency : DEFAULT_CURRENCY;
      setActiveFontScale(fontScale);
      set({ fontScale, currency });
    } catch {
      setActiveFontScale(DEFAULT_FONT_SCALE);
      set({ fontScale: DEFAULT_FONT_SCALE, currency: DEFAULT_CURRENCY });
    }
  },

  setFontScale: (key) => {
    // 先更新样式层读取的缩放系数，再通知订阅者重渲染
    setActiveFontScale(key);
    set({ fontScale: key });
    void AsyncStorage.setItem(FONT_SCALE_STORAGE_KEY, key).catch(() => undefined);
  },

  setCurrency: (code) => {
    set({ currency: code });
    void AsyncStorage.setItem(CURRENCY_STORAGE_KEY, code).catch(() => undefined);
  },
}));

/**
 * 订阅全局字号档位（仅用于驱动屏幕重渲染）。
 *
 * `theme.createStyles` 在读取样式时按当前档位物化样式对象，因此屏幕重渲染即生效，
 * 不需要重建导航或重启应用。
 */
export const useFontScaleSubscription = (): void => {
  useSettingsStore((state) => state.fontScale);
};
