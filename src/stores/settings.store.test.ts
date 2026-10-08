import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_CURRENCY } from '@/domain/currency';
import { DEFAULT_FONT_SCALE } from '@/theme/font-scale';

import { useSettingsStore } from './settings.store';

const STORAGE_KEY = 'settings:fontScale';
const CURRENCY_KEY = 'settings:currency';
const AMOUNTS_HIDDEN_KEY = 'settings:amountsHidden';

describe('useSettingsStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState({
      fontScale: DEFAULT_FONT_SCALE,
      currency: DEFAULT_CURRENCY,
      amountsHidden: false,
    });
  });

  it('setFontScale 立即生效并写入本地存储', async () => {
    useSettingsStore.getState().setFontScale('large');

    expect(useSettingsStore.getState().fontScale).toBe('large');
    await Promise.resolve();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('large');
  });

  it('hydrate 读取已保存档位', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'small');
    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().fontScale).toBe('small');
  });

  it('hydrate 遇到非法值时回落标准档', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'gigantic');
    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().fontScale).toBe(DEFAULT_FONT_SCALE);
  });

  it('默认币种为 CNY，setCurrency 写入本地存储', async () => {
    expect(useSettingsStore.getState().currency).toBe('CNY');

    useSettingsStore.getState().setCurrency('USD');

    expect(useSettingsStore.getState().currency).toBe('USD');
    await Promise.resolve();
    expect(await AsyncStorage.getItem(CURRENCY_KEY)).toBe('USD');
  });

  it('hydrate 读取已保存币种，非法值回落 CNY', async () => {
    await AsyncStorage.setItem(CURRENCY_KEY, 'EUR');
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().currency).toBe('EUR');

    await AsyncStorage.setItem(CURRENCY_KEY, 'RMB');
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().currency).toBe(DEFAULT_CURRENCY);
  });

  it('金额默认可见，setAmountsHidden 立即生效并写入本地存储', async () => {
    expect(useSettingsStore.getState().amountsHidden).toBe(false);

    useSettingsStore.getState().setAmountsHidden(true);

    expect(useSettingsStore.getState().amountsHidden).toBe(true);
    await Promise.resolve();
    expect(await AsyncStorage.getItem(AMOUNTS_HIDDEN_KEY)).toBe('1');

    useSettingsStore.getState().setAmountsHidden(false);
    await Promise.resolve();
    expect(await AsyncStorage.getItem(AMOUNTS_HIDDEN_KEY)).toBe('0');
  });

  it('hydrate 恢复上次的金额隐藏状态', async () => {
    await AsyncStorage.setItem(AMOUNTS_HIDDEN_KEY, '1');
    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().amountsHidden).toBe(true);

    await AsyncStorage.setItem(AMOUNTS_HIDDEN_KEY, '0');
    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().amountsHidden).toBe(false);
  });

  it('hydrate 遇到非法隐藏状态回落为显示金额', async () => {
    await AsyncStorage.setItem(AMOUNTS_HIDDEN_KEY, 'yes');
    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().amountsHidden).toBe(false);
  });
});
