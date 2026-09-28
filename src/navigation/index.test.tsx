import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useSettingsStore } from '@/stores/settings.store';
import { createStyles } from '@/theme';
import { DEFAULT_FONT_SCALE, setActiveFontScale } from '@/theme/font-scale';

import { withFontScale } from './index';

const styles = createStyles({ label: { fontSize: 20 } });

/** 纯展示屏幕，用于验证包装层只负责订阅档位 */
const Screen = () => (
  <Text testID="label" style={styles.label}>
    共 12 笔
  </Text>
);

const WrappedScreen = withFontScale(Screen);

describe('withFontScale', () => {
  beforeEach(() => {
    setActiveFontScale(DEFAULT_FONT_SCALE);
    useSettingsStore.setState({ fontScale: DEFAULT_FONT_SCALE });
  });

  it('字号档位变化时包装屏幕重渲染，样式按新档位取值', () => {
    render(<WrappedScreen />);
    expect(screen.getByTestId('label').props.style.fontSize).toBe(20);

    act(() => useSettingsStore.getState().setFontScale('xlarge'));

    // 20 * 1.3 = 26
    expect(screen.getByTestId('label').props.style.fontSize).toBe(26);
  });

  it('切换回标准档恢复基准字号', () => {
    render(<WrappedScreen />);
    act(() => useSettingsStore.getState().setFontScale('large'));
    act(() => useSettingsStore.getState().setFontScale('standard'));
    expect(screen.getByTestId('label').props.style.fontSize).toBe(20);
  });
});
