/**
 * 全局字号档位（对齐微信「设置 → 字体大小」）。
 *
 * 标准档为当前设计基准（缩放系数 1），其余档位按比例缩放 `theme.fontSize` 与
 * 样式中显式写死的 `fontSize` / `lineHeight`。当前档位保存在模块级变量中，
 * 由 settings.store 写入，`createStyles` 在读取样式时（getter）应用缩放。
 */

export const FONT_SCALE_KEYS = ['small', 'standard', 'large', 'xlarge'] as const;

export type FontScaleKey = (typeof FONT_SCALE_KEYS)[number];

/** 当前设计基准即「标准」档 */
export const DEFAULT_FONT_SCALE: FontScaleKey = 'standard';

export const FONT_SCALE_LABELS: Record<FontScaleKey, string> = {
  small: '小',
  standard: '标准',
  large: '大',
  xlarge: '超大',
};

const FONT_SCALE_RATIO: Record<FontScaleKey, number> = {
  small: 0.9,
  standard: 1,
  large: 1.15,
  xlarge: 1.3,
};

let activeRatio = FONT_SCALE_RATIO[DEFAULT_FONT_SCALE];

export const isFontScaleKey = (value: unknown): value is FontScaleKey =>
  typeof value === 'string' && (FONT_SCALE_KEYS as readonly string[]).includes(value);

export const setActiveFontScale = (key: FontScaleKey): void => {
  activeRatio = FONT_SCALE_RATIO[key];
};

export const getActiveFontScale = (): FontScaleKey => {
  const matched = FONT_SCALE_KEYS.find((key) => FONT_SCALE_RATIO[key] === activeRatio);
  return matched ?? DEFAULT_FONT_SCALE;
};

/** 按当前档位缩放字号：取整避免半像素字号造成的排版抖动 */
export const scaleFontSize = (base: number): number => Math.round(base * activeRatio);
