import { render, screen } from '@testing-library/react-native';

import type { AxisLabelLayout } from '@/domain/trendAxis';

import { TrendXAxis } from './TrendXAxis';

const LABELS: AxisLabelLayout[] = [
  { index: 0, text: '2月1日', width: 40, left: 10, top: 4 },
  { index: 3, text: '3月', width: 30, left: 80, top: 6 },
];

const flatStyle = (style: unknown): Record<string, unknown> =>
  [style].flat(Infinity).reduce<Record<string, unknown>>(
    (acc, item) => ({ ...acc, ...((item as Record<string, unknown>) ?? {}) }),
    {},
  );

describe('TrendXAxis', () => {
  it('按布局渲染每个刻度文案', () => {
    render(<TrendXAxis height={40} labels={LABELS} />);
    expect(screen.getByText('2月1日')).toBeTruthy();
    expect(screen.getByText('3月')).toBeTruthy();
  });

  it('每个标签旋转 -45° 并使用布局给出的位置', () => {
    render(<TrendXAxis height={40} labels={LABELS} />);
    const style = flatStyle(screen.getByText('3月').props.style);
    expect(style.transform).toEqual([{ rotate: '-45deg' }]);
    expect(style.left).toBe(80);
    expect(style.top).toBe(6);
    expect(style.width).toBe(30);
  });

  it('无刻度时不渲染任何标签', () => {
    render(<TrendXAxis height={0} labels={[]} />);
    expect(screen.queryByText('2月1日')).toBeNull();
  });
});
