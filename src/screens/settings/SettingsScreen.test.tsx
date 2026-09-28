import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { formatCents } from '@/domain/money';
import { useSettingsStore } from '@/stores/settings.store';
import { useThemeStore } from '@/stores/theme.store';
import { fontSize, scaleFontSize } from '@/theme';
import { DEFAULT_FONT_SCALE } from '@/theme/font-scale';
import { DARK_COLORS, LIGHT_COLORS } from '@/theme/palette';
import { DEFAULT_THEME_MODE } from '@/theme/scheme';

import { PREVIEW_AMOUNT_CENTS, SettingsScreen } from './SettingsScreen';

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
    useSettingsStore.setState({ fontScale: DEFAULT_FONT_SCALE });
    useThemeStore.setState({ mode: DEFAULT_THEME_MODE, systemScheme: 'light', scheme: 'light' });
  });

  it('展示四个字号档位', () => {
    renderScreen();
    expect(screen.getByText('字体大小')).toBeTruthy();
    for (const label of ['小', '标准', '大', '超大']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('点击档位立即切换字号', () => {
    renderScreen();

    fireEvent.press(screen.getByText('超大'));

    expect(useSettingsStore.getState().fontScale).toBe('xlarge');
  });

  it('展示深色模式三档并可切换到深色', () => {
    renderScreen();
    expect(screen.getByText('深色模式')).toBeTruthy();
    for (const label of ['跟随系统', '浅色', '深色']) {
      expect(screen.getByText(label)).toBeTruthy();
    }

    fireEvent.press(screen.getByText('深色'));

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().scheme).toBe('dark');
  });

  it('点击浅色可从深色切回', () => {
    useThemeStore.setState({ mode: 'dark', systemScheme: 'light', scheme: 'dark' });
    renderScreen();

    fireEvent.press(screen.getByText('浅色'));

    expect(useThemeStore.getState().scheme).toBe('light');
  });

  it('重渲染后实际样式字号按新档位缩放（样式工厂生效）', () => {
    renderScreen();
    // fontSize.md = 15（标准档基准）
    expect(screen.getByText('字体大小').props.style.fontSize).toBe(15);

    fireEvent.press(screen.getByText('超大'));

    // 15 * 1.3 = 19.5 → 20
    expect(screen.getByText('字体大小').props.style.fontSize).toBe(20);
  });

  it('预览卡片展示标题 / 正文标签 / 次要说明 / 金额样例与生效提示', () => {
    renderScreen();

    expect(screen.getByTestId('settings-preview-title')).toBeTruthy();
    expect(screen.getByTestId('settings-preview-label')).toBeTruthy();
    expect(screen.getByTestId('settings-preview-secondary')).toBeTruthy();
    expect(screen.getByText(formatCents(PREVIEW_AMOUNT_CENTS))).toBeTruthy();
    expect(screen.getByText('切换后立即生效，无需重启 App')).toBeTruthy();
  });

  it('切换档位后预览区域字号实际变化，且样式引用随档位变化', () => {
    renderScreen();

    const previewBefore = screen.getByTestId('settings-preview-title').props.style;
    expect(previewBefore.fontSize).toBe(fontSize.lg); // 17（标准档基准）

    fireEvent.press(screen.getByText('超大'));

    const previewAfter = screen.getByTestId('settings-preview-title').props.style;
    // RN（Fabric）diff 先比较引用，引用不变就不会下发新字号
    expect(previewAfter).not.toBe(previewBefore);
    expect(previewAfter.fontSize).toBe(scaleFontSize(fontSize.lg, 'xlarge')); // 17 * 1.3 = 22.1 → 22
    expect(screen.getByTestId('settings-preview-amount').props.style.fontSize).toBe(
      scaleFontSize(fontSize.xl, 'xlarge'), // 20 * 1.3 = 26
    );
    expect(screen.getByTestId('settings-preview-secondary').props.style.fontSize).toBe(
      scaleFontSize(fontSize.xs, 'xlarge'), // 11 * 1.3 = 14.3 → 14
    );

    // 切回标准档：字号回到基准，且引用与标准档缓存一致
    fireEvent.press(screen.getByText('标准'));
    expect(screen.getByTestId('settings-preview-title').props.style).toBe(previewBefore);
    expect(screen.getByTestId('settings-preview-title').props.style.fontSize).toBe(fontSize.lg);
  });

  it('切换深色后页面文字颜色取深色调色板', () => {
    renderScreen();
    expect(screen.getByText('设置').props.style.color).toBe(LIGHT_COLORS.text);

    fireEvent.press(screen.getByText('深色'));

    // 标题样式重新物化出新引用，颜色来自深色调色板
    expect(screen.getByText('设置').props.style.color).toBe(DARK_COLORS.text);
  });
});
