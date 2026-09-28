/**
 * 配色方案（浅色 / 深色）与「深色模式」三档设置。
 *
 * 纯函数模块：不持有任何可变状态、不依赖 store，便于 domain 化测试；
 * 生效中的方案由 `stores/theme.store` 持有，样式层通过 `useColors` / `makeStyles` 读取。
 */

import { DARK_COLORS, LIGHT_COLORS, type ThemeColors } from './palette';

/** 深色模式设置：跟随系统 / 固定浅色 / 固定深色 */
export const THEME_MODES = ['system', 'light', 'dark'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

/** 实际生效的配色 */
export type ColorScheme = 'light' | 'dark';

/** 默认跟随系统 */
export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
};

export const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);

export const isColorScheme = (value: unknown): value is ColorScheme =>
  value === 'light' || value === 'dark';

/** 系统配色归一化：未知 / 空值一律按浅色处理 */
export const toColorScheme = (value: string | null | undefined): ColorScheme =>
  value === 'dark' ? 'dark' : 'light';

/** 由「设置档位 + 系统配色」解析出实际生效的配色 */
export const resolveScheme = (mode: ThemeMode, systemScheme: ColorScheme): ColorScheme =>
  mode === 'system' ? systemScheme : mode;

/** 取配色令牌 */
export const paletteOf = (scheme: ColorScheme): ThemeColors =>
  scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
