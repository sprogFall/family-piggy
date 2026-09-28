/**
 * 全局字号档位（对齐微信「设置 → 字体大小」）。
 *
 * 标准档为当前设计基准（缩放系数 1），其余档位按比例缩放 `theme.fontSize` 与
 * 样式中显式写死的 `fontSize` / `lineHeight`。
 *
 * 纯函数模块：档位本身由 `stores/settings.store` 持有，`theme.makeStyles` 在物化样式时
 * 把档位传进来（而非读取模块级变量），因此切换档位只依赖「订阅 + 重新物化」这一条路径。
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

export const isFontScaleKey = (value: unknown): value is FontScaleKey =>
  typeof value === 'string' && (FONT_SCALE_KEYS as readonly string[]).includes(value);

/** 按指定档位缩放字号：取整避免半像素字号造成的排版抖动 */
export const scaleFontSize = (
  base: number,
  scale: FontScaleKey = DEFAULT_FONT_SCALE,
): number => Math.round(base * FONT_SCALE_RATIO[scale]);
