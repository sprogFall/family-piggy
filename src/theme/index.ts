/** 设计令牌：所有颜色 / 间距 / 字号统一从这里取 */

import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { scaleFontSize } from './font-scale';

export {
  FONT_SCALE_KEYS,
  FONT_SCALE_LABELS,
  DEFAULT_FONT_SCALE,
  isFontScaleKey,
  scaleFontSize,
} from './font-scale';
export type { FontScaleKey } from './font-scale';

export const colors = {
  primary: '#00B578',
  primaryDark: '#00945F',
  primaryLight: '#E6F7F0',
  primaryDisabled: '#A8DFC6',
  bg: '#F7F8FA',
  card: '#FFFFFF',
  border: '#EFEFEF',
  text: '#1A1A1A',
  textSecondary: '#999999',
  textTertiary: '#CCCCCC',
  income: '#00B578',
  expense: '#1A1A1A',
  danger: '#FA5151',
  white: '#FFFFFF',
  /** 浮窗（Toast）背景 */
  toastBg: 'rgba(26,26,26,0.86)',
  /** 按压态水波纹（Android），限定在控件内，避免溢出到相邻元素 */
  ripple: 'rgba(0, 181, 120, 0.12)',
} as const;

/** 折线 / 占比图调色板 */
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
} as const;

export const space = (n: number): number => n * 4;

export const TABBAR_HEIGHT = 58;

export type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/** 随全局字号档位缩放的样式属性 */
const SCALED_STYLE_KEYS = ['fontSize', 'lineHeight'] as const;

const withScaledFont = <T extends object>(style: T): T => {
  for (const key of SCALED_STYLE_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(style, key);
    // 已是缩放后的 getter（同一份样式对象被多处复用时）不重复缩放
    if (!descriptor || descriptor.get || typeof descriptor.value !== 'number') continue;
    const base = descriptor.value;
    Object.defineProperty(style, key, {
      configurable: true,
      enumerable: true,
      get: () => scaleFontSize(base),
    });
  }
  return style;
};

/**
 * 样式创建入口，等价于 `StyleSheet.create`，额外让 `fontSize` / `lineHeight`
 * 跟随「设置 → 字体大小」档位缩放。
 *
 * 缩放值在**读取样式时**计算（属性 getter），因此切换档位后组件重渲染即生效，
 * 既能覆盖 `fontSize.md` 这类令牌，也能覆盖样式里显式写死的字号。
 *
 * 签名与 react-native 的 `StyleSheet.create` 完全一致：泛型里必须出现 `any`
 * （`NamedStyles<any>` 交叉类型为对象字面量提供上下文类型，否则 `alignItems: 'center'`
 * 会被推断成 string 而类型报错；仅用 `unknown` 无法替代），故此处保留 any。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const createStyles = <T extends NamedStyles<T> | NamedStyles<any>>(
  styles: T & NamedStyles<any>,
): T => {
  for (const style of Object.values(styles)) withScaledFont(style);
  return styles;
};
