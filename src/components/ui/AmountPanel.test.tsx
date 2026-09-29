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

  it('表达式实时展示结果，灰色副文案保留计算过程', () => {
    render(
      <AmountPanel
        currency="CNY"
        amount="50-1"
        result="49.00"
        dateLabel="今天"
        onPressCurrency={jest.fn()}
        onPressDate={jest.fn()}
      />,
    );

    expect(screen.getByTestId('amount-value').props.children).toBe('49');
    expect(screen.getByTestId('amount-expression').props.children).toBe('50-1');
  });

  it('点击金额区域唤起键盘', () => {
    const onPressAmount = jest.fn();
    render(
      <AmountPanel
        currency="CNY"
        amount=""
        result={null}
        dateLabel="今天"
        onPressCurrency={jest.fn()}
        onPressDate={jest.fn()}
        onPressAmount={onPressAmount}
      />,
    );

    fireEvent.press(screen.getByLabelText('编辑金额'));
    expect(onPressAmount).toHaveBeenCalledTimes(1);
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
