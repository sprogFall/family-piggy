import { fireEvent, render, screen } from '@testing-library/react-native';

import { AmountKeypad } from './AmountKeypad';

describe('AmountKeypad', () => {
  it('按键触发 onChange 并按金额规则计算', () => {
    const onChange = jest.fn();
    render(<AmountKeypad value="12.5" onChange={onChange} onSubmit={jest.fn()} />);

    fireEvent.press(screen.getByText('3'));
    expect(onChange).toHaveBeenCalledWith('12.53');

    fireEvent.press(screen.getByLabelText('backspace'));
    expect(onChange).toHaveBeenLastCalledWith('12.');
  });

  it('重复小数点不产生变化', () => {
    const onChange = jest.fn();
    render(<AmountKeypad value="1.2" onChange={onChange} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('.'));
    expect(onChange).toHaveBeenCalledWith('1.2');
  });

  it('submitDisabled 时点击完成不触发', () => {
    const onSubmit = jest.fn();
    render(
      <AmountKeypad value="" onChange={jest.fn()} onSubmit={onSubmit} submitDisabled />,
    );
    fireEvent.press(screen.getByText('完成'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('正常提交', () => {
    const onSubmit = jest.fn();
    render(<AmountKeypad value="23.68" onChange={jest.fn()} onSubmit={onSubmit} />);
    fireEvent.press(screen.getByText('完成'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
