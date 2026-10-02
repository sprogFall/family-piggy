import { useCallback, useMemo, useState } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { Text, View } from 'react-native';
import { Circle, Line, Polyline, Rect, Svg } from 'react-native-svg';

import { barRects, lineGeometryRange, nearestPointIndex, seriesBounds, tooltipPlacement } from '@/domain/charts';
import type { CurrencyCode } from '@/domain/currency';
import { formatCompactMoney, formatMoney } from '@/domain/money';
import type { RangeTrendPoint } from '@/domain/statement';
import { makeStyles, CHART_PALETTE, useColors, fontSize, radius, space } from '@/theme';

import { StatsTrendTooltip, type TooltipSize } from './StatsTrendTooltip';

const VIEW_WIDTH = 320;
const PADDING = 14;
const GRID_LINES = [0.25, 0.5, 0.75] as const;
const GUIDE_DASH = '3 3';
const TOOLTIP_ESTIMATE: TooltipSize = { width: 120, height: 72 };
const X_LABEL_WIDTH = 60;

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
  currency: CurrencyCode;
  accessibilityLabel?: string;
  height?: number;
}

const xLabelIndexes = (count: number): number[] => {
  if (count <= 0) return [];
  if (count <= 7) return Array.from({ length: count }, (_, index) => index);
  const last = count - 1;
  const step = Math.ceil(last / 3);
  const indexes = [0, step, step * 2, last].filter(
    (value, index, list) => value <= last && list.indexOf(value) === index,
  );
  return indexes;
};

export const StatsTrendChart = ({
  points,
  mode,
  chartType,
  currency,
  accessibilityLabel = '统计周期收支趋势图，按住或滑动可查看数值',
  height = 176,
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipSize, setTooltipSize] = useState<TooltipSize>(TOOLTIP_ESTIMATE);

  const series: Series[] = useMemo(
    () =>
      mode === 'both'
        ? [
            {
              key: 'expense',
              label: '支出',
              color: colors.primary,
              values: points.map((point) => point.expense),
            },
            {
              key: 'income',
              label: '收入',
              color: CHART_PALETTE[1],
              values: points.map((point) => point.income),
            },
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
              values: points.map((point) =>
                mode === 'expense' ? point.expense : mode === 'income' ? point.income : point.balance,
              ),
            },
          ],
    [colors.primary, mode, points],
  );

  const bounds = useMemo(() => seriesBounds(series.map((item) => item.values)), [series]);
  const lineGeometry = useMemo(
    () =>
      series.map((item) =>
        lineGeometryRange(item.values, VIEW_WIDTH, height, PADDING, bounds.min, bounds.max),
      ),
    [bounds.max, bounds.min, height, series],
  );
  const bars = useMemo(
    () =>
      series.map((item, index) =>
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
      ),
    [bounds.max, bounds.min, height, series],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const handleTouch = (event: GestureResponderEvent) => {
    const index = nearestPointIndex(
      event.nativeEvent.locationX,
      points.length,
      containerWidth,
      VIEW_WIDTH,
      PADDING,
    );
    setActiveIndex(index >= 0 ? index : null);
  };

  const handleRelease = () => setActiveIndex(null);

  const handleTooltipMeasure = useCallback((size: TooltipSize) => {
    setTooltipSize((prev) =>
      prev.width === size.width && prev.height === size.height ? prev : size,
    );
  }, []);

  const active =
    activeIndex !== null && activeIndex < points.length
      ? {
          index: activeIndex,
          x: lineGeometry[0]?.coords[activeIndex]?.x ?? 0,
          y: Math.min(...lineGeometry.map((geometry) => geometry.coords[activeIndex]?.y ?? height)),
        }
      : null;

  const tooltip = active
    ? tooltipPlacement({
        point: { x: active.x, y: active.y },
        viewWidth: VIEW_WIDTH,
        viewHeight: height,
        containerWidth,
        containerHeight: height,
        tooltipWidth: tooltipSize.width,
        tooltipHeight: tooltipSize.height,
      })
    : null;

  const tooltipEntries = active
    ? series.map((item) => ({
        label: item.label,
        color: item.color,
        value: formatMoney(item.values[active.index] ?? 0, currency, {
          signed: item.key === 'balance',
        }),
      }))
    : [];

  if (points.length === 0) return null;

  const yLabels = [bounds.max, (bounds.max + bounds.min) / 2, bounds.min];
  const labels = xLabelIndexes(points.length);

  return (
    <View style={styles.chartRow}>
      <View style={[styles.yAxis, { height }]}>
        {yLabels.map((value) => (
          <Text key={value} style={styles.yLabel} numberOfLines={1}>
            {formatCompactMoney(value, currency)}
          </Text>
        ))}
      </View>

      <View style={styles.plotWrap}>
        <View
          testID="stats-trend-chart-plot"
          style={[styles.plot, { height }]}
          accessibilityLabel={accessibilityLabel}
          onLayout={handleLayout}
          onStartShouldSetResponder={() => points.length > 0}
          onMoveShouldSetResponder={() => points.length > 0}
          onResponderGrant={handleTouch}
          onResponderMove={handleTouch}
          onResponderRelease={handleRelease}
          onResponderTerminate={handleRelease}
        >
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
                      height={bar.height > 0 ? Math.max(bar.height, 1) : 0}
                      rx={2}
                      fill={series[seriesIndex].color}
                      opacity={activeIndex === index ? 1 : 0.88}
                      stroke={activeIndex === index ? colors.text : 'none'}
                      strokeWidth={activeIndex === index ? 1 : 0}
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
                    points.length <= 40 && index !== activeIndex ? (
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

            {active ? (
              <>
                <Line
                  testID="stats-trend-guide"
                  x1={active.x}
                  y1={PADDING / 2}
                  x2={active.x}
                  y2={height - PADDING / 2}
                  stroke={colors.textTertiary}
                  strokeWidth={1}
                  strokeDasharray={GUIDE_DASH}
                />
                {chartType === 'line'
                  ? lineGeometry.map((geometry, seriesIndex) => (
                      <Circle
                        key={`active-${series[seriesIndex].key}`}
                        testID={`stats-trend-active-${series[seriesIndex].key}`}
                        cx={geometry.coords[active.index]?.x ?? active.x}
                        cy={geometry.coords[active.index]?.y ?? height / 2}
                        r={4}
                        fill={series[seriesIndex].color}
                        stroke={colors.card}
                        strokeWidth={1.5}
                      />
                    ))
                  : null}
              </>
            ) : null}
          </Svg>

          {active && tooltip ? (
            <StatsTrendTooltip
              label={points[active.index].label}
              entries={tooltipEntries}
              left={tooltip.left}
              top={tooltip.top}
              onMeasure={handleTooltipMeasure}
            />
          ) : null}
        </View>

        <View style={[styles.xAxis, { height: 18 }]}>
          {labels.map((index) => {
            const coord = lineGeometry[0]?.coords[index];
            const rawX = coord ? (coord.x / VIEW_WIDTH) * containerWidth : 0;
            const left = Math.max(0, Math.min(containerWidth - X_LABEL_WIDTH, rawX - X_LABEL_WIDTH / 2));
            return (
              <Text
                key={points[index].key}
                style={[styles.xLabel, { left, width: X_LABEL_WIDTH }]}
                numberOfLines={1}
              >
                {points[index].label}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  chartRow: {
    flexDirection: 'row',
  },
  plot: {
    position: 'relative',
  },
  plotWrap: {
    flex: 1,
  },
  xAxis: {
    marginTop: space(1),
    position: 'relative',
  },
  xLabel: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    position: 'absolute',
    textAlign: 'center',
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: space(1.5),
    paddingVertical: PADDING / 2,
    width: 52,
  },
  yLabel: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    textAlign: 'right',
  },
}));
