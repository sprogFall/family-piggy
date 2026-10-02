import { fireEvent, render, screen, within } from '@testing-library/react-native';

import type { RangeTrendPoint } from '@/domain/statement';

import { StatsTrendChart } from './StatsTrendChart';

const POINTS: RangeTrendPoint[] = [
  { key: '2024-02-01', label: '2月1日', expense: 100, income: 0, balance: -100 },
  { key: '2024-02-02', label: '2月2日', expense: 200, income: 500, balance: 300 },
  { key: '2024-02-03', label: '2月3日', expense: 300, income: 0, balance: -300 },
];

const CONTAINER_WIDTH = 300;
const CHART_HEIGHT = 176;

const layoutEvent = (width = CONTAINER_WIDTH) => ({
  nativeEvent: { layout: { height: CHART_HEIGHT, width, x: 0, y: 0 } },
});
const touchEvent = (locationX: number) => ({ nativeEvent: { locationX } });

const mountChart = (
  mode: 'expense' | 'income' | 'balance' | 'both' = 'both',
  chartType: 'bar' | 'line' = 'bar',
) => {
  render(<StatsTrendChart points={POINTS} mode={mode} chartType={chartType} currency="CNY" />);
  const plot = screen.getByTestId('stats-trend-chart-plot');
  fireEvent(plot, 'layout', layoutEvent());
  return plot;
};

describe('StatsTrendChart', () => {
  it('柱状图按住显示周期与各序列金额，松开隐藏', () => {
    const plot = mountChart();
    expect(screen.queryByTestId('stats-trend-tooltip')).toBeNull();

    fireEvent(plot, 'responderGrant', touchEvent(CONTAINER_WIDTH / 2));
    const tooltip = screen.getByTestId('stats-trend-tooltip');

    expect(within(tooltip).getByText('2月2日')).toBeTruthy();
    expect(within(tooltip).getByText('支出 ¥2.00')).toBeTruthy();
    expect(within(tooltip).getByText('收入 ¥5.00')).toBeTruthy();

    fireEvent(plot, 'responderRelease', touchEvent(CONTAINER_WIDTH / 2));
    expect(screen.queryByTestId('stats-trend-tooltip')).toBeNull();
  });

  it('曲线图高亮当前点并切换数值', () => {
    const plot = mountChart('both', 'line');
    fireEvent(plot, 'responderGrant', touchEvent(CONTAINER_WIDTH / 2));

    expect(screen.getByTestId('stats-trend-guide')).toBeTruthy();
    expect(screen.getByTestId('stats-trend-active-expense')).toBeTruthy();
    expect(screen.getByTestId('stats-trend-active-income')).toBeTruthy();

    fireEvent(plot, 'responderMove', touchEvent(CONTAINER_WIDTH));
    expect(within(screen.getByTestId('stats-trend-tooltip')).getByText('2月3日')).toBeTruthy();
  });

  it('结余为负时浮层带负号，纵轴出现最小负值', () => {
    const plot = mountChart('balance', 'line');
    fireEvent(plot, 'responderGrant', touchEvent(0));

    expect(within(screen.getByTestId('stats-trend-tooltip')).getByText('结余 -¥1.00')).toBeTruthy();
    expect(screen.getByText('-¥3')).toBeTruthy();
  });

  it('展示横轴日期与纵轴金额刻度', () => {
    mountChart('expense', 'bar');
    expect(screen.getByText('2月1日')).toBeTruthy();
    expect(screen.getByText('2月3日')).toBeTruthy();
    expect(screen.getByText('¥3')).toBeTruthy();
    expect(screen.getByText('¥0')).toBeTruthy();
  });
});
