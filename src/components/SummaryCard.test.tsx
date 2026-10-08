import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { useSettingsStore } from '@/stores/settings.store';

import { SummaryCard } from './SummaryCard';

const renderCard = () =>
  render(<SummaryCard expense={236800} income={380000} balance={143200} currency="CNY" />);

describe('SummaryCard', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState({ amountsHidden: false });
  });

  it('眼睛图标切换金额显示 / 隐藏', () => {
    renderCard();

    expect(screen.getByText('¥2,368.00')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('隐藏金额'));
    expect(screen.queryByText('¥2,368.00')).toBeNull();
    expect(screen.getAllByText('****').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByLabelText('显示金额')).toBeTruthy();
  });

  it('隐藏状态写入本地设置，重新挂载后依然隐藏', () => {
    const { unmount } = renderCard();
    fireEvent.press(screen.getByLabelText('隐藏金额'));
    expect(useSettingsStore.getState().amountsHidden).toBe(true);
    unmount();

    renderCard();

    expect(screen.queryByText('¥2,368.00')).toBeNull();
    expect(screen.getByLabelText('显示金额')).toBeTruthy();
  });
});
