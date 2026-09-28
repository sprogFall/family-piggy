import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';

import {
  DEFAULT_THEME_MODE,
  isThemeMode,
  resolveScheme,
  toColorScheme,
  type ColorScheme,
  type ThemeMode,
} from '@/theme/scheme';

const THEME_MODE_STORAGE_KEY = 'settings:themeMode';

interface ThemeState {
  /** 深色模式设置：跟随系统 / 浅色 / 深色 */
  mode: ThemeMode;
  /** 系统配色（仅「跟随系统」档位参与解析） */
  systemScheme: ColorScheme;
  /** 实际生效的配色：样式层只读它 */
  scheme: ColorScheme;
  /** 启动时读取本地设置；读取失败回落到默认值 */
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => void;
  /** 系统深浅色变化（Appearance 回调）时同步 */
  setSystemScheme: (scheme: ColorScheme) => void;
}

/** 读取系统当前配色：启动初始值与 Appearance 回调都走这里归一化 */
export const currentSystemScheme = (): ColorScheme => toColorScheme(Appearance.getColorScheme());

const derive = (mode: ThemeMode, systemScheme: ColorScheme) => ({
  mode,
  systemScheme,
  scheme: resolveScheme(mode, systemScheme),
});

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...derive(DEFAULT_THEME_MODE, currentSystemScheme()),

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);
      const mode = isThemeMode(stored) ? stored : DEFAULT_THEME_MODE;
      set(derive(mode, get().systemScheme));
    } catch {
      set(derive(DEFAULT_THEME_MODE, get().systemScheme));
    }
  },

  setMode: (mode) => {
    set(derive(mode, get().systemScheme));
    void AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, mode).catch(() => undefined);
  },

  setSystemScheme: (scheme) => set(derive(get().mode, scheme)),
}));
