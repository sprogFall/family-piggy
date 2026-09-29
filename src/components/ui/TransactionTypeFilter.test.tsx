import { fireEvent, render, screen } from '@testing-library/react-native';

import { TransactionTypeFilter } from './TransactionTypeFilter';

describe('TransactionTypeFilter', () => {
  it('展示全部 / 报销 / 未报销选项并标出当前选中', () => {
    render(<TransactionTypeFilter value="all" onChange={jest.fn()} />);

    expect(screen.getByText('全部')).toBeTruthy();
    expect(screen.getByText('报销')).toBeTruthy();
    expect(screen.getByText('未报销')).toBeTruthy();
    expect(screen.getByLabelText('全部').props.accessibilityState).toEqual({ selected: true });
  });

  it('点击选项回调对应筛选值', () => {
    const onChange = jest.fn();
    render(<TransactionTypeFilter value="all" onChange={onChange} />);

    fireEvent.press(screen.getByLabelText('报销'));
    expect(onChange).toHaveBeenCalledWith('reimbursement');
  });
});
