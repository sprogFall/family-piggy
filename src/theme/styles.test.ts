import { act, renderHook } from '@testing-library/react-native';

import { useSettingsStore } from '@/stores/settings.store';
import { useThemeStore } from '@/stores/theme.store';

import { DEFAULT_FONT_SCALE } from './font-scale';
import { makeStyles, useColors } from './index';
import { DARK_COLORS, LIGHT_COLORS } from './palette';
import { DEFAULT_THEME_MODE } from './scheme';

const useStyles = makeStyles((colors) => ({
  accent: { color: colors.text, fontSize: 20, fontWeight: '600' },
  card: { backgroundColor: colors.card, padding: 16 },
  lineHeightBox: { fontSize: 15, lineHeight: 24 },
}));

const setScheme = (scheme: 'light' | 'dark') =>
  useThemeStore.setState({ mode: scheme, systemScheme: scheme, scheme });

const setFontScale = (fontScale: typeof DEFAULT_FONT_SCALE) =>
  useSettingsStore.setState({ fontScale });

describe('makeStyles', () => {
  beforeEach(() => {
    setScheme('light');
    setFontScale(DEFAULT_FONT_SCALE);
  });

  it('fontSize / lineHeight 随字号档位缩放，其余属性不受影响', () => {
    const { result } = renderHook(() => useStyles());
    expect(result.current.accent.fontSize).toBe(20);
    expect(result.current.lineHeightBox.fontSize).toBe(15);
    expect(result.current.lineHeightBox.lineHeight).toBe(24);
    expect(result.current.accent.fontWeight).toBe('600');
    expect(result.current.card.padding).toBe(16);

    act(() => setFontScale('xlarge'));

    expect(result.current.lineHeightBox.fontSize).toBe(20); // 15 * 1.3 = 19.5 → 20
    expect(result.current.lineHeightBox.lineHeight).toBe(31); // 24 * 1.3 = 31.2 → 31
    expect(result.current.accent.fontSize).toBe(26);
    expect(result.current.card.padding).toBe(16);
  });

  it('同一「配色 + 档位」组合下返回同一引用，组合变化后引用必然变化', () => {
    const { result } = renderHook(() => useStyles());
    const atLightStandard = result.current;
    expect(result.current).toBe(atLightStandard);

    // RN（Fabric）diff 依赖 props 引用变化：组合没变必须稳定，变了必须换引用
    act(() => setScheme('dark'));
    expect(result.current).not.toBe(atLightStandard);
    const atDarkStandard = result.current;
    expect(result.current).toBe(atDarkStandard);

    act(() => setFontScale('large'));
    expect(result.current).not.toBe(atDarkStandard);

    act(() => setFontScale(DEFAULT_FONT_SCALE));
    expect(result.current).toBe(atDarkStandard);
  });

  it('配色切换后样式取到对应调色板，切换回来复用缓存引用', () => {
    const { result } = renderHook(() => useStyles());
    expect(result.current.accent.color).toBe(LIGHT_COLORS.text);
    expect(result.current.card.backgroundColor).toBe(LIGHT_COLORS.card);

    act(() => setScheme('dark'));
    expect(result.current.accent.color).toBe(DARK_COLORS.text);
    expect(result.current.card.backgroundColor).toBe(DARK_COLORS.card);

    act(() => setScheme('light'));
    expect(result.current.accent.color).toBe(LIGHT_COLORS.text);
  });

  it('物化对象是普通可枚举属性的 plain object，不含 getter', () => {
    const { result } = renderHook(() => useStyles());
    const accent = result.current.accent;

    const fontSizeDescriptor = Object.getOwnPropertyDescriptor(accent, 'fontSize');
    expect(fontSizeDescriptor?.get).toBeUndefined();
    expect(fontSizeDescriptor?.enumerable).toBe(true);
    expect(Object.keys(accent)).toEqual(['color', 'fontSize', 'fontWeight']);
  });
});

describe('useColors', () => {
  it('返回当前生效的调色板，切换后返回新配色', () => {
    const { result } = renderHook(() => useColors());
    expect(result.current).toBe(LIGHT_COLORS);

    act(() => setScheme('dark'));
    expect(result.current).toBe(DARK_COLORS);
  });

  it('跟随系统档位下，系统配色变化即生效', () => {
    useThemeStore.setState({ mode: DEFAULT_THEME_MODE, systemScheme: 'light', scheme: 'light' });
    const { result } = renderHook(() => useColors());
    expect(result.current).toBe(LIGHT_COLORS);

    act(() => useThemeStore.getState().setSystemScheme('dark'));
    expect(result.current).toBe(DARK_COLORS);
    expect(useThemeStore.getState().scheme).toBe('dark');
  });
});
