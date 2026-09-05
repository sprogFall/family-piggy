import { Circle, Path, Polyline, Svg } from 'react-native-svg';

import { lineGeometry } from '@/domain/charts';
import { colors } from '@/theme';

const VIEW_WIDTH = 320;

interface Props {
  /** 每日数值（如每日支出金额，单位分） */
  values: number[];
  height?: number;
}

export const TrendChart = ({ values, height = 120 }: Props) => {
  const { points, area, coords } = lineGeometry(values, VIEW_WIDTH, height, 18);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} preserveAspectRatio="none">
      {area ? <Path d={area} fill={colors.primary} opacity={0.12} /> : null}
      {points ? (
        <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={2} />
      ) : null}
      {coords.map((coord, index) => (
        <Circle key={index} cx={coord.x} cy={coord.y} r={2.5} fill={colors.primary} />
      ))}
    </Svg>
  );
};
