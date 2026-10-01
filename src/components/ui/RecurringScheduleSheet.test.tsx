import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecurringScheduleSheet } from './RecurringScheduleSheet';

describe('RecurringScheduleSheet', () => {
  it('每月模式选择日期后确认回调 monthly', () => {
    const onConfirm = jest.fn();
    render(
      <RecurringScheduleSheet
        visible
        value={{ frequency: 'monthly', monthlyDay: 10 }}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByLabelText('10号').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByLabelText('15号'));
    fireEvent.press(screen.getByText('确定'));
    expect(onConfirm).toHaveBeenCalledWith({ frequency: 'monthly', monthlyDay: 15 });
  });

  it('切到每周并选择周几后确认回调 weekly', () => {
    const onConfirm = jest.fn();
    render(
      <RecurringScheduleSheet
        visible
        value={null}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(screen.getByLabelText('每周'));
    fireEvent.press(screen.getByLabelText('周三'));
    fireEvent.press(screen.getByText('确定'));
    expect(onConfirm).toHaveBeenCalledWith({ frequency: 'weekly', weeklyDay: 3 });
  });
});
