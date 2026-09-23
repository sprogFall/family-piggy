import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { donutCenterBox } from '@/domain/charts';

import { DonutChart } from './DonutChart';

describe('DonutChart', () => {
  it('中心文案容器按几何居中（显式 top/left，不依赖静态位置）', () => {
    render(
      <DonutChart
        segments={[{ value: 75200, color: '#00B578' }]}
        centerLabel="752.00"
        centerSub="本月支出"
      />,
    );

    const expected = donutCenterBox(140, 22);
    const style = StyleSheet.flatten(screen.getByTestId('donut-center').props.style);

    expect(style.top).toBeCloseTo(expected.offset, 5);
    expect(style.left).toBeCloseTo(expected.offset, 5);
    expect(style.width).toBeCloseTo(expected.size, 5);
    expect(style.height).toBeCloseTo(expected.size, 5);

    expect(screen.getByText('752.00')).toBeTruthy();
    expect(screen.getByText('本月支出')).toBeTruthy();
  });
});
