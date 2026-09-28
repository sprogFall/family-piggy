import { Path, Svg } from 'react-native-svg';
import { Text, View } from 'react-native';

import { arcPath, donutArcs, donutCenterBox } from '@/domain/charts';
import { createStyles, colors, fontSize } from '@/theme';

export interface DonutSegment {
  value: number;
  color: string;
}

interface Props {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}

export const DonutChart = ({
  segments,
  size = 140,
  thickness = 22,
  centerLabel,
  centerSub,
}: Props) => {
  const active = segments.filter((segment) => segment.value > 0);
  const arcs = donutArcs(active.map((segment) => segment.value));
  const radius = size / 2;
  const center = donutCenterBox(size, thickness);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {arcs.map((arc, index) => (
          <Path
            key={index}
            d={arcPath(radius, radius, radius, radius - thickness, arc.startDeg, arc.endDeg)}
            fill={active[index].color}
          />
        ))}
      </Svg>
      <View
        testID="donut-center"
        style={[
          styles.center,
          { height: center.size, left: center.offset, top: center.offset, width: center.size },
        ]}
      >
        <Text style={styles.centerLabel} numberOfLines={1}>
          {centerLabel ?? ''}
        </Text>
        {centerSub ? <Text style={styles.centerSub}>{centerSub}</Text> : null}
      </View>
    </View>
  );
};

const styles = createStyles({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  centerLabel: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  centerSub: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
