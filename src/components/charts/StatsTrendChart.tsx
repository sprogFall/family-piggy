import { View, Text } from 'react-native';
import { Circle, Line, Polyline, Rect, Svg } from 'react-native-svg';

import { barRects, lineGeometryRange, seriesBounds } from '@/domain/charts';
import type { RangeTrendPoint } from '@/domain/statement';
import { makeStyles, CHART_PALETTE, useColors, fontSize, radius, space } from '@/theme';

const VIEW_WIDTH = 320;
const PADDING = 14;
const GRID_LINES = [0.25, 0.5, 0.75] as const;

export type TrendSeriesMode = 'expense' | 'income' | 'balance' | 'both';
export type TrendChartType = 'bar' | 'line';

interface Series {
  key: 'expense' | 'income' | 'balance';
  label: string;
  color: string;
  values: number[];
}

interface Props {
  points: RangeTrendPoint[];
  mode: TrendSeriesMode;
  chartType: TrendChartType;
  accessibilityLabel?: string;
  height?: number;
}

const xLabelIndexes = (count: number): number[] => {
  if (count <= 0) return [];
  if (count <= 7) return Array.from({ length: count }, (_, index) => index);
  return [0, Math.floor((count - 1) / 2), count - 1];
};

export const StatsTrendChart = ({
  points,
  mode,
  chartType,
  accessibilityLabel = '统计周期收支趋势图',
  height = 176,
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const series: Series[] =
    mode === 'both'
      ? [
          { key: 'expense', label: '支出', color: colors.primary, values: points.map((point) => point.expense) },
          { key: 'income', label: '收入', color: CHART_PALETTE[1], values: points.map((point) => point.income) },
        ]
      : [
          {
            key: mode,
            label: mode === 'expense' ? '支出' : mode === 'income' ? '收入' : '结余',
            color:
              mode === 'expense'
                ? colors.primary
                : mode === 'income'
                  ? CHART_PALETTE[1]
                  : CHART_PALETTE[2],
            values: points.map((point) => (mode === 'expense' ? point.expense : mode === 'income' ? point.income : point.balance)),
          },
        ];

  if (points.length === 0) return null;

  const bounds = seriesBounds(series.map((item) => item.values));
  const lineGeometry = series.map((item) =>
    lineGeometryRange(item.values, VIEW_WIDTH, height, PADDING, bounds.min, bounds.max),
  );
  const bars = series.map((item, index) =>
    barRects(
      item.values,
      VIEW_WIDTH,
      height,
      PADDING,
      bounds.min,
      bounds.max,
      index,
      series.length,
    ),
  );
  const labels = xLabelIndexes(points.length);

  return (
    <View>
      <View style={[styles.plot, { height }]} accessibilityLabel={accessibilityLabel}>
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
          preserveAspectRatio="none"
        >
          {GRID_LINES.map((ratio) => {
            const y = PADDING + (height - PADDING * 2) * ratio;
            return (
              <Line
                key={ratio}
                x1={PADDING}
                y1={y}
                x2={VIEW_WIDTH - PADDING}
                y2={y}
                stroke={colors.border}
                strokeWidth={1}
              />
            );
          })}
          {chartType === 'bar'
            ? bars.flatMap((item, seriesIndex) =>
                item.map((bar, index) => (
                  <Rect
                    key={`${series[seriesIndex].key}-${index}`}
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={Math.max(bar.height, bar.height > 0 ? 1 : 0)}
                    rx={2}
                    fill={series[seriesIndex].color}
                  />
                )),
              )
            : lineGeometry.map((geometry, seriesIndex) => (
                <Polyline
                  key={series[seriesIndex].key}
                  points={geometry.points}
                  fill="none"
                  stroke={series[seriesIndex].color}
                  strokeWidth={2}
                />
              ))}
          {chartType === 'line'
            ? lineGeometry.flatMap((geometry, seriesIndex) =>
                geometry.coords.map((coord, index) =>
                  points.length <= 40 ? (
                    <Circle
                      key={`${series[seriesIndex].key}-dot-${index}`}
                      cx={coord.x}
                      cy={coord.y}
                      r={2.5}
                      fill={series[seriesIndex].color}
                    />
                  ) : null,
                ),
              )
            : null}
        </Svg>
      </View>
      <View style={styles.labels}>
        {labels.map((index) => (
          <Text key={points[index].key} style={styles.label} numberOfLines={1}>
            {points[index].label}
          </Text>
        ))}
      </View>
      {series.length > 1 ? (
        <View style={styles.legend}>
          {series.map((item) => (
            <View key={item.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  label: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    maxWidth: 120,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space(3),
    paddingTop: space(1),
  },
  legend: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(2),
  },
  legendDot: {
    borderRadius: radius.round,
    height: 6,
    width: 6,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(1),
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  plot: {
    position: 'relative',
  },
}));
