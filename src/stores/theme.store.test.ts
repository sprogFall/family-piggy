import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_THEME_MODE } from '@/theme/scheme';

import { useThemeStore } from './theme.store';

const MODE_KEY = 'settings:themeMode';

describe('useThemeStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useThemeStore.setState({ mode: DEFAULT_THEME_MODE, systemScheme: 'light', scheme: 'light' });
  });

  it('默认跟随系统，系统为浅色时生效浅色', () => {
    expect(useThemeStore.getState().mode).toBe(DEFAULT_THEME_MODE);
    expect(useThemeStore.getState().scheme).toBe('light');
  });

  it('setMode 立即生效并写入本地存储', async () => {
    useThemeStore.getState().setMode('dark');

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().scheme).toBe('dark');
    await Promise.resolve();
    expect(await AsyncStorage.getItem(MODE_KEY)).toBe('dark');
  });

  it('hydrate 读取已保存档位', async () => {
    await AsyncStorage.setItem(MODE_KEY, 'dark');
    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().scheme).toBe('dark');
  });

  it('hydrate 遇到非法值回落跟随系统', async () => {
    await AsyncStorage.setItem(MODE_KEY, 'midnight');
    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe(DEFAULT_THEME_MODE);
  });

  it('跟随系统档位下系统配色变化立即生效', () => {
    useThemeStore.getState().setSystemScheme('dark');

    expect(useThemeStore.getState().scheme).toBe('dark');

    useThemeStore.getState().setSystemScheme('light');
    expect(useThemeStore.getState().scheme).toBe('light');
  });

  it('手动档位不受系统配色影响', () => {
    useThemeStore.getState().setMode('light');
    useThemeStore.getState().setSystemScheme('dark');
    expect(useThemeStore.getState().scheme).toBe('light');

    useThemeStore.getState().setMode('dark');
    useThemeStore.getState().setSystemScheme('light');
    expect(useThemeStore.getState().scheme).toBe('dark');
  });
});
