/** 设计令牌与样式工厂：所有颜色 / 间距 / 字号统一从这里取 */

import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { useSettingsStore } from '@/stores/settings.store';
import { useThemeStore } from '@/stores/theme.store';

import { scaleFontSize, type FontScaleKey } from './font-scale';
import { paletteOf } from './scheme';
import type { ThemeColors } from './palette';

export { DEFAULT_FONT_SCALE, FONT_SCALE_KEYS, FONT_SCALE_LABELS, isFontScaleKey, scaleFontSize } from './font-scale';
export type { FontScaleKey } from './font-scale';
export { DARK_COLORS, LIGHT_COLORS } from './palette';
export type { ThemeColors } from './palette';
export {
  DEFAULT_THEME_MODE,
  isColorScheme,
  isThemeMode,
  paletteOf,
  resolveScheme,
  THEME_MODE_LABELS,
  THEME_MODES,
  toColorScheme,
} from './scheme';
export type { ColorScheme, ThemeMode } from './scheme';

/** 折线 / 占比图调色板（深浅两套配色下均可用） */
export const CHART_PALETTE = [
  '#00B578',
  '#4A90E2',
  '#F5A623',
  '#F76B6B',
  '#9B59B6',
  '#26C6DA',
  '#FF8A65',
  '#7E57C2',
  '#90A4AE',
] as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  round: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  /** 「记一笔」金额展示字号（设计基准，随字号档位缩放） */
  display: 40,
} as const;

export const space = (n: number): number => n * 4;

export const TABBAR_HEIGHT = 58;

/** 「记一笔」金额行最小高度：整行加高，让金额更抢眼 */
export const AMOUNT_ROW_MIN_HEIGHT = 96;

export type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

type Style = ViewStyle | TextStyle | ImageStyle;

/** 随全局字号档位缩放的样式属性 */
const SCALED_STYLE_KEYS = ['fontSize', 'lineHeight'] as const;

const isScaledKey = (key: string): boolean => (SCALED_STYLE_KEYS as readonly string[]).includes(key);

/** 当前生效配色：订阅主题仓库，切换深色模式后读取即拿到新配色 */
export const useColors = (): ThemeColors =>
  paletteOf(useThemeStore((state) => state.scheme));

/** 当前字号档位（订阅设置仓库） */
export const useFontScale = (): FontScaleKey =>
  useSettingsStore((state) => state.fontScale);

/** 把单份样式里的 fontSize / lineHeight 按档位物化，其余属性原样透传 */
const materializeStyle = (style: Style, scale: FontScaleKey): Style => {
  const source = style as Record<string, unknown>;
  const materialized: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    const value = source[key];
    materialized[key] =
      isScaledKey(key) && typeof value === 'number' ? scaleFontSize(value, scale) : value;
  }
  return materialized as Style;
};

/** 物化整份样式集合：输出是普通可枚举属性的 plain object（不含 getter），RN 才能序列化下发原生 */
const materializeStyles = <S>(styles: S, scale: FontScaleKey): S => {
  const source = styles as unknown as Record<string, Style>;
  const result: Record<string, Style> = {};
  for (const name of Object.keys(source)) {
    result[name] = materializeStyle(source[name], scale);
  }
  return result as unknown as S;
};

/**
 * 样式工厂：`const useStyles = makeStyles((colors) => ({...}))`，组件内 `const styles = useStyles()`。
 *
 * 工厂在**渲染时**按「当前配色 + 当前字号档位」执行并物化字号，同一组合只物化一次并缓存：
 * - 组合不变 → 返回**同一引用**。RN（Fabric）的 `diffProperties` 先比较 `prevProp === nextProp`，
 *   引用稳定才不会每次渲染都把样式重新下发原生。
 * - 配色或档位变化 → 返回**新引用**，屏幕重渲染即生效，切换深色模式 / 字号无需重启应用。
 *
 * 签名与 `StyleSheet.create` 一致：泛型里必须出现 `any`（`NamedStyles<any>` 交叉类型为对象
 * 字面量提供上下文类型，否则 `alignItems: 'center'` 会被推断成 string 而类型报错；
 * 仅用 `unknown` 无法替代），故此处保留 any。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const makeStyles = <T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & NamedStyles<any>,
): (() => T) => {
  const cache = new Map<string, T>();
  return function useStyles(): T {
    const scheme = useThemeStore((state) => state.scheme);
    const fontScale = useFontScale();
    const key = `${scheme}:${fontScale}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const created = materializeStyles<T>(factory(paletteOf(scheme)), fontScale);
    cache.set(key, created);
    return created;
  };
};
