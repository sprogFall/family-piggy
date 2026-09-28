import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/stores/settings.store';
import { DEFAULT_FONT_SCALE, getActiveFontScale, setActiveFontScale } from '@/theme/font-scale';

import { SettingsScreen } from './SettingsScreen';

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as never;
const route = {} as never;

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <SettingsScreen navigation={navigation} route={route} />
    </SafeAreaProvider>,
  );

describe('SettingsScreen', () => {
  beforeEach(() => {
    setActiveFontScale(DEFAULT_FONT_SCALE);
    useSettingsStore.setState({ fontScale: DEFAULT_FONT_SCALE });
  });

  it('展示四个字号档位', () => {
    renderScreen();
    expect(screen.getByText('字体大小')).toBeTruthy();
    for (const label of ['小', '标准', '大', '超大']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('点击档位立即切换字号并写入全局缩放系数', () => {
    renderScreen();

    fireEvent.press(screen.getByText('超大'));

    expect(useSettingsStore.getState().fontScale).toBe('xlarge');
    expect(getActiveFontScale()).toBe('xlarge');
  });

  it('重渲染后实际样式字号按新档位缩放（getter 生效）', () => {
    renderScreen();
    // fontSize.md = 15（标准档基准）
    expect(screen.getByText('字体大小').props.style.fontSize).toBe(15);

    fireEvent.press(screen.getByText('超大'));

    // 15 * 1.3 = 19.5 → 20
    expect(screen.getByText('字体大小').props.style.fontSize).toBe(20);
  });
});
