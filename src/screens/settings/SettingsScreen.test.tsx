import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { formatCents } from '@/domain/money';
import { useSettingsStore } from '@/stores/settings.store';
import { fontSize, scaleFontSize } from '@/theme';
import { DEFAULT_FONT_SCALE, getActiveFontScale, setActiveFontScale } from '@/theme/font-scale';

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
    expect(previewAfter.fontSize).toBe(scaleFontSize(fontSize.lg)); // 17 * 1.3 = 22.1 → 22
    expect(screen.getByTestId('settings-preview-amount').props.style.fontSize).toBe(
      scaleFontSize(fontSize.xl), // 20 * 1.3 = 26
    );
    expect(screen.getByTestId('settings-preview-secondary').props.style.fontSize).toBe(
      scaleFontSize(fontSize.xs), // 11 * 1.3 = 14.3 → 14
    );

    // 切回标准档：字号回到基准，且引用与标准档缓存一致
    fireEvent.press(screen.getByText('标准'));
    expect(screen.getByTestId('settings-preview-title').props.style).toBe(previewBefore);
    expect(screen.getByTestId('settings-preview-title').props.style.fontSize).toBe(fontSize.lg);
  });
});
