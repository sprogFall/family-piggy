import { DARK_COLORS, LIGHT_COLORS } from './palette';
import {
  DEFAULT_THEME_MODE,
  isColorScheme,
  isThemeMode,
  paletteOf,
  resolveScheme,
  THEME_MODE_LABELS,
  THEME_MODES,
  toColorScheme,
} from './scheme';

describe('调色板', () => {
  it('深浅两套令牌一一对应，且都有取值', () => {
    expect(Object.keys(DARK_COLORS).sort()).toEqual(Object.keys(LIGHT_COLORS).sort());
    for (const [token, value] of Object.entries(LIGHT_COLORS)) {
      expect([token, typeof value]).toEqual([token, 'string']);
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('深色配色走微信风格：深灰底而非纯黑，正文接近白但非纯白', () => {
    expect(DARK_COLORS.bg).toBe('#111111');
    expect(DARK_COLORS.text).toBe('#EDEDED');
    expect(DARK_COLORS.card).not.toBe(DARK_COLORS.bg);
  });

  it('品牌绿与「彩色底上的白色」在深浅两套中保持一致', () => {
    expect(DARK_COLORS.primary).toBe(LIGHT_COLORS.primary);
    expect(DARK_COLORS.white).toBe(LIGHT_COLORS.white);
  });

  it('paletteOf 按配色返回对应令牌', () => {
    expect(paletteOf('light')).toBe(LIGHT_COLORS);
    expect(paletteOf('dark')).toBe(DARK_COLORS);
  });
});

describe('深色模式设置', () => {
  it('三档均有中文文案，默认跟随系统', () => {
    expect(THEME_MODES).toEqual(['system', 'light', 'dark']);
    expect(THEME_MODE_LABELS).toEqual({ system: '跟随系统', light: '浅色', dark: '深色' });
    expect(DEFAULT_THEME_MODE).toBe('system');
  });

  it('isThemeMode / isColorScheme 只接受合法值', () => {
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('black')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isColorScheme('dark')).toBe(true);
    expect(isColorScheme('system')).toBe(false);
  });

  it('toColorScheme 把未知 / 空值归一成浅色', () => {
    expect(toColorScheme('dark')).toBe('dark');
    expect(toColorScheme('light')).toBe('light');
    expect(toColorScheme(null)).toBe('light');
    expect(toColorScheme(undefined)).toBe('light');
  });

  it('resolveScheme：跟随系统时取系统配色，手动档位覆盖系统', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});
