import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { useSettingsStore } from '@/stores/settings.store';
import { AMOUNT_ROW_MIN_HEIGHT, fontSize } from '@/theme';
import { DEFAULT_FONT_SCALE } from '@/theme/font-scale';

import { AmountPanel } from './AmountPanel';

const renderPanel = (amount: string) =>
  render(
    <AmountPanel
      currency="CNY"
      amount={amount}
      dateLabel="今天"
      onPressCurrency={jest.fn()}
      onPressDate={jest.fn()}
    />,
  );

const flatStyle = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

describe('AmountPanel', () => {
  beforeEach(() => useSettingsStore.setState({ fontScale: DEFAULT_FONT_SCALE }));

  it('展示币种符号、金额与日期', () => {
    renderPanel('23.68');

    expect(screen.getByText('CNY')).toBeTruthy();
    expect(screen.getByText('¥')).toBeTruthy();
    expect(screen.getByText('23.68')).toBeTruthy();
    expect(screen.getByText('今天')).toBeTruthy();
  });

  it('未输入金额时展示 0.00 并用弱化色，输入后转为正文色', () => {
    const { rerender } = renderPanel('');
    const placeholderColor = flatStyle('amount-value').color;
    expect(screen.getByText('0.00')).toBeTruthy();

    rerender(
      <AmountPanel
        currency="CNY"
        amount="12"
        dateLabel="今天"
        onPressCurrency={jest.fn()}
        onPressDate={jest.fn()}
      />,
    );

    expect(flatStyle('amount-value').color).not.toBe(placeholderColor);
  });

  it('金额行整体加高，金额用「金额展示」大字号', () => {
    renderPanel('');

    expect(flatStyle('amount-panel').minHeight).toBe(AMOUNT_ROW_MIN_HEIGHT);
    expect(flatStyle('amount-value').fontSize).toBe(fontSize.display);
    expect(fontSize.display).toBeGreaterThan(fontSize.xxl);
  });

  it('点击币种 / 日期分别回调', () => {
    const onPressCurrency = jest.fn();
    const onPressDate = jest.fn();
    render(
      <AmountPanel
        currency="USD"
        amount="1"
        dateLabel="昨天"
        onPressCurrency={onPressCurrency}
        onPressDate={onPressDate}
      />,
    );

    fireEvent.press(screen.getByLabelText('选择币种'));
    expect(onPressCurrency).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('选择日期'));
    expect(onPressDate).toHaveBeenCalledTimes(1);
  });
});
