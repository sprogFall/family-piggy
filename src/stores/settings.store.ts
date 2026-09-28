import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  DEFAULT_FONT_SCALE,
  isFontScaleKey,
  setActiveFontScale,
  type FontScaleKey,
} from '@/theme/font-scale';

const STORAGE_KEY = 'settings:fontScale';

interface SettingsState {
  /** 全局字号档位（标准 = 设计基准） */
  fontScale: FontScaleKey;
  /** 启动时读取本地设置；读取失败回落到标准档 */
  hydrate: () => Promise<void>;
  setFontScale: (key: FontScaleKey) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  fontScale: DEFAULT_FONT_SCALE,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const key = isFontScaleKey(stored) ? stored : DEFAULT_FONT_SCALE;
      setActiveFontScale(key);
      set({ fontScale: key });
    } catch {
      setActiveFontScale(DEFAULT_FONT_SCALE);
      set({ fontScale: DEFAULT_FONT_SCALE });
    }
  },

  setFontScale: (key) => {
    // 先更新样式层读取的缩放系数，再通知订阅者重渲染
    setActiveFontScale(key);
    set({ fontScale: key });
    void AsyncStorage.setItem(STORAGE_KEY, key).catch(() => undefined);
  },
}));

/**
 * 订阅全局字号档位（仅用于驱动屏幕重渲染）。
 *
 * `theme.createStyles` 在读取样式属性时按当前档位计算字号，因此屏幕重渲染即生效，
 * 不需要重建导航或重启应用。
 */
export const useFontScaleSubscription = (): void => {
  useSettingsStore((state) => state.fontScale);
};
