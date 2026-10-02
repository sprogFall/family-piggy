import type { LayoutChangeEvent } from 'react-native';
import { Text, View } from 'react-native';

import { makeStyles, fontSize, radius, space } from '@/theme';

export interface TooltipSize {
  width: number;
  height: number;
}

export interface TooltipEntry {
  label: string;
  value: string;
  color: string;
}

interface Props {
  label: string;
  entries: TooltipEntry[];
  left: number;
  top: number;
  onMeasure?: (size: TooltipSize) => void;
}

/** 统计趋势图浮层：周期 + 当前序列金额，不拦截触摸 */
export const StatsTrendTooltip = ({ label, entries, left, top, onMeasure }: Props) => {
  const styles = useStyles();
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    onMeasure?.({ width, height });
  };

  return (
    <View
      testID="stats-trend-tooltip"
      pointerEvents="none"
      style={[styles.bubble, { left, top }]}
      onLayout={handleLayout}
    >
      <Text style={styles.period} numberOfLines={1}>
        {label}
      </Text>
      {entries.map((entry) => (
        <View key={entry.label} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: entry.color }]} />
          <Text style={styles.entryText}>{`${entry.label} ${entry.value}`}</Text>
        </View>
      ))}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  bubble: {
    backgroundColor: colors.toastBg,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    position: 'absolute',
  },
  dot: {
    borderRadius: radius.round,
    height: 6,
    width: 6,
  },
  entryText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  period: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginBottom: space(1),
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(1.5),
    marginTop: 2,
    minWidth: 112,
  },
}));
