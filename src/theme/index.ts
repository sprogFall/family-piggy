/** 设计令牌：所有颜色 / 间距 / 字号统一从这里取 */

import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { getActiveFontScale, type FontScaleKey, scaleFontSize } from './font-scale';

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

type Style = ViewStyle | TextStyle | ImageStyle;

/** 随全局字号档位缩放的样式属性 */
const SCALED_STYLE_KEYS = ['fontSize', 'lineHeight'] as const;

const isScaledKey = (key: string): boolean => (SCALED_STYLE_KEYS as readonly string[]).includes(key);

/**
 * 物化缓存：原始样式对象 → （档位 → 该档位下物化出的新样式对象）。
 *
 * 用 WeakMap 以原始样式对象为键，样式对象本身被回收时缓存随之释放，不会泄漏内存。
 */
const materializedByScale = new WeakMap<Style, Map<FontScaleKey, Style>>();

/**
 * 按当前档位把原始样式「物化」成一份新的 plain object：`fontSize` / `lineHeight`
 * 缩放，其余属性原样透传，属性全部是可枚举的普通属性（不含 getter）。
 *
 * 同一档位下命中缓存返回**同一引用**（同一份样式对象被多处复用、以及每帧重渲染时
 * 都不会新建对象）；切换档位则一定返回**新引用** —— React Native（Fabric）在
 * diffProperties 里先比较 `prevProp === nextProp`，引用不变就认为没有变化、
 * 不会把新字号下发原生，因此引用必须随档位变化。
 *
 * 物化对象永远从原始样式重新计算，不会在已缩放的对象上再次缩放。
 */
const materializeStyle = <S extends Style>(style: S): S => {
  let cache = materializedByScale.get(style);
  if (!cache) {
    cache = new Map<FontScaleKey, Style>();
    materializedByScale.set(style, cache);
  }

  const scale = getActiveFontScale();
  const cached = cache.get(scale);
  if (cached) return cached as S;

  const source = style as Record<string, unknown>;
  const materialized: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    const value = source[key];
    materialized[key] =
      isScaledKey(key) && typeof value === 'number' ? scaleFontSize(value) : value;
  }

  cache.set(scale, materialized as Style);
  return materialized as S;
};

/**
 * 样式创建入口，等价于 `StyleSheet.create`，额外让 `fontSize` / `lineHeight`
 * 跟随「设置 → 字体大小」档位缩放。
 *
 * 返回的容器对象每个属性都是 getter：读取时（即组件重渲染时）按当前档位物化出
 * 一份新的样式对象，因此切换档位，屏幕重渲染后字号立即生效，无需重启 App。
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
  const source = styles as Record<string, Style>;
  const container: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    const original = source[key];
    Object.defineProperty(container, key, {
      configurable: true,
      enumerable: true,
      get: () => materializeStyle(original),
    });
  }
  return container as T;
};
