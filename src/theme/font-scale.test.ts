import {
  DEFAULT_FONT_SCALE,
  FONT_SCALE_KEYS,
  FONT_SCALE_LABELS,
  isFontScaleKey,
  scaleFontSize,
} from './font-scale';

describe('font-scale', () => {
  it('四个档位均有中文文案，且标准档为默认档', () => {
    expect(FONT_SCALE_KEYS).toEqual(['small', 'standard', 'large', 'xlarge']);
    expect(FONT_SCALE_LABELS).toEqual({ small: '小', standard: '标准', large: '大', xlarge: '超大' });
    expect(DEFAULT_FONT_SCALE).toBe('standard');
  });

  it('标准档保持设计基准字号不变', () => {
    expect(scaleFontSize(13, 'standard')).toBe(13);
    expect(scaleFontSize(34, 'standard')).toBe(34);
  });

  it('不传档位时按标准档计算', () => {
    expect(scaleFontSize(13)).toBe(13);
  });

  it('小 / 大 / 超大档按比例缩放并取整', () => {
    expect(scaleFontSize(15, 'small')).toBe(14); // 15 * 0.9 = 13.5 → 14
    expect(scaleFontSize(15, 'large')).toBe(17); // 17.25
    expect(scaleFontSize(15, 'xlarge')).toBe(20); // 19.5
    expect(scaleFontSize(11, 'xlarge')).toBe(14);
  });

  it('isFontScaleKey 只接受四个合法档位', () => {
    expect(isFontScaleKey('large')).toBe(true);
    expect(isFontScaleKey('huge')).toBe(false);
    expect(isFontScaleKey(null)).toBe(false);
    expect(isFontScaleKey(1)).toBe(false);
  });
});
