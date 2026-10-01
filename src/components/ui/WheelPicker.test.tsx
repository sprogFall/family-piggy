import { fireEvent, render, screen } from '@testing-library/react-native';

import { WheelPicker } from './WheelPicker';

const options = [
  { label: '每月', value: 'monthly' as const },
  { label: '每周', value: 'weekly' as const },
];

describe('WheelPicker', () => {
  it('标记当前选中项，点击其他项回调', () => {
    const onChange = jest.fn();
    render(<WheelPicker options={options} value="monthly" onChange={onChange} />);

    expect(screen.getByLabelText('每月').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByLabelText('每周'));
    expect(onChange).toHaveBeenCalledWith('weekly');
  });

  it('滚动结束后按偏移量吸附到对应项', () => {
    const onChange = jest.fn();
    render(<WheelPicker options={options} value="monthly" onChange={onChange} testID="wheel" />);

    fireEvent(screen.getByTestId('wheel'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 44 } },
    });
    expect(onChange).toHaveBeenCalledWith('weekly');
  });
});
