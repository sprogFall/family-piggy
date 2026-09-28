import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { CurrencyCode } from '@/domain/currency';
import type { TrendPoint } from '@/domain/statement';
import { colors } from '@/theme';

import { TrendChart } from './TrendChart';

const POINTS: TrendPoint[] = [
  { day: 1, expense: 100, income: 0 },
  { day: 2, expense: 200, income: 500 },
  { day: 3, expense: 300, income: 0 },
];

const CHART_HEIGHT = 120;
/** 图表容器实际宽度（onLayout 量得），与 Svg 的 viewBox 宽度不同 */
const CONTAINER_WIDTH = 300;

const layoutEvent = (width = CONTAINER_WIDTH) => ({
  nativeEvent: { layout: { height: CHART_HEIGHT, width, x: 0, y: 0 } },
});

const touchEvent = (locationX: number) => ({ nativeEvent: { locationX } });

const mountChart = (points: TrendPoint[] = POINTS, currency: CurrencyCode = 'CNY') => {
  render(<TrendChart points={points} month={2} currency={currency} />);
  const plot = screen.getByTestId('trend-chart-plot');
  fireEvent(plot, 'layout', layoutEvent());
  return plot;
};

describe('TrendChart', () => {
  it('按住时显示「日期 / 支出 / 收入」浮层', () => {
    const plot = mountChart();
    expect(screen.queryByTestId('trend-tooltip')).toBeNull();

    // 容器 300px、viewBox 320px，容器中点命中第 2 天（下标 1）
    fireEvent(plot, 'responderGrant', touchEvent(CONTAINER_WIDTH / 2));

    expect(screen.getByText('2月2日')).toBeTruthy();
    expect(screen.getByText('支出 ¥2.00')).toBeTruthy();
    expect(screen.getByText('收入 ¥5.00')).toBeTruthy();
  });

  it('浮层金额按所属币种展示', () => {
    const plot = mountChart(POINTS, 'USD');
    fireEvent(plot, 'responderGrant', touchEvent(CONTAINER_WIDTH / 2));
    expect(screen.getByText('支出 $2.00')).toBeTruthy();
  });

  it('高亮当前点：竖参考线 + 放大圆点，并随手指滑动切换', () => {
    const plot = mountChart();
    fireEvent(plot, 'responderGrant', touchEvent(CONTAINER_WIDTH / 2));
    expect(screen.getByTestId('trend-guide')).toBeTruthy();
    expect(screen.getByTestId('trend-active-expense')).toBeTruthy();
    expect(screen.getByTestId('trend-active-income')).toBeTruthy();

    fireEvent(plot, 'responderMove', touchEvent(CONTAINER_WIDTH));
    expect(screen.getByText('2月3日')).toBeTruthy();
    // 末个数据点落在 viewBox 的右内边距处（320 - 18）
    expect(screen.getByTestId('trend-guide').props.x1).toBeCloseTo(302, 5);
  });

  it('浮层半透明、圆角且不拦截触摸，并收敛在容器内', () => {
    const plot = mountChart(POINTS);
    fireEvent(plot, 'responderGrant', touchEvent(CONTAINER_WIDTH));
    const tooltip = screen.getByTestId('trend-tooltip');
    const style = StyleSheet.flatten(tooltip.props.style);

    expect(tooltip.props.pointerEvents).toBe('none');
    expect(style.backgroundColor).toBe(colors.toastBg);
    expect(style.position).toBe('absolute');
    expect(style.left).toBeGreaterThanOrEqual(0);
    expect(style.left).toBeLessThanOrEqual(CONTAINER_WIDTH);
  });

  it('手指抬起后浮层消失、高亮恢复', () => {
    const plot = mountChart();
    fireEvent(plot, 'responderGrant', touchEvent(CONTAINER_WIDTH / 2));
    fireEvent(plot, 'responderRelease', touchEvent(CONTAINER_WIDTH / 2));

    expect(screen.queryByTestId('trend-tooltip')).toBeNull();
    expect(screen.queryByTestId('trend-guide')).toBeNull();
  });

  it('无数据 / 全 0 时不崩溃，也不会显示浮层', () => {
    const plot = mountChart([]);
    fireEvent(plot, 'responderGrant', touchEvent(CONTAINER_WIDTH / 2));
    expect(screen.queryByTestId('trend-tooltip')).toBeNull();

    const zeroPlot = mountChart([{ day: 1, expense: 0, income: 0 }]);
    fireEvent(zeroPlot, 'responderGrant', touchEvent(0));
    expect(screen.getByText('支出 ¥0.00')).toBeTruthy();
    expect(screen.getByText('收入 ¥0.00')).toBeTruthy();
  });

  it('图表容器带无障碍描述，并展示支出 / 收入图例', () => {
    mountChart();
    expect(screen.getByLabelText('本月收支趋势折线图，按住或滑动可查看某一天的收支')).toBeTruthy();
    expect(screen.getByText('支出')).toBeTruthy();
    expect(screen.getByText('收入')).toBeTruthy();
  });
});
