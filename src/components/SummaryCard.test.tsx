import { fireEvent, render, screen } from '@testing-library/react-native';

import { SummaryCard } from './SummaryCard';

describe('SummaryCard', () => {
  it('眼睛图标切换金额显示 / 隐藏', () => {
    render(
      <SummaryCard expense={236800} income={380000} balance={143200} currency="CNY" />,
    );

    expect(screen.getByText('¥2,368.00')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('隐藏金额'));
    expect(screen.queryByText('¥2,368.00')).toBeNull();
    expect(screen.getAllByText('••••').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByLabelText('显示金额')).toBeTruthy();
  });
});
