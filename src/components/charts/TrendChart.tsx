import { useCallback, useMemo, useState } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { Text, View } from 'react-native';
import { Circle, Line, Path, Polyline, Svg } from 'react-native-svg';

import { lineGeometry, nearestPointIndex, tooltipPlacement, trendDayLabel } from '@/domain/charts';
import type { CurrencyCode } from '@/domain/currency';
import type { TrendPoint } from '@/domain/statement';
import { createStyles, CHART_PALETTE, colors, fontSize, radius, space } from '@/theme';

import { TrendTooltip, type TooltipSize } from './TrendTooltip';

/** Svg 内部固定 viewBox 宽度；容器宽度由 onLayout 量取（宽度 100% 横向拉伸，坐标需换算） */
const VIEW_WIDTH = 320;
/** 折线上下留白，避免圆点被裁切 */
const PADDING = 18;
/** 常态圆点半径 */
const POINT_RADIUS = 2.5;
/** 选中态放大圆点半径 */
const ACTIVE_POINT_RADIUS = 4.5;
/** 竖参考线虚线样式 */
const GUIDE_DASH = '3 3';
/** 支出面积填充的不透明度 */
const AREA_OPACITY = 0.12;
/** 浮层尺寸估算值：真实尺寸由 TrendTooltip 量取后回填 */
const TOOLTIP_ESTIMATE: TooltipSize = { width: 104, height: 76 };
const ACCESSIBILITY_LABEL = '本月收支趋势折线图，按住或滑动可查看某一天的收支';

const EXPENSE_COLOR = colors.primary;
const INCOME_COLOR = CHART_PALETTE[1];

const LEGEND = [
  { label: '支出', color: EXPENSE_COLOR },
  { label: '收入', color: INCOME_COLOR },
] as const;

interface Props {
  /** 整月每日收支（分），按日期升序 */
  points: TrendPoint[];
  /** 所属月份 1-12，用于浮层日期文案 */
  month: number;
  /** 汇总币种（浮层金额按该币种展示） */
  currency: CurrencyCode;
  height?: number;
  accessibilityLabel?: string;
}

/** 本月收支趋势折线图：双折线 + 按住 / 滑动查看某天数值 */
export const TrendChart = ({
  points,
  month,
  currency,
  height = 120,
  accessibilityLabel = ACCESSIBILITY_LABEL,
}: Props) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipSize, setTooltipSize] = useState<TooltipSize>(TOOLTIP_ESTIMATE);

  const { expense, income } = useMemo(() => {
    const expenseValues = points.map((point) => point.expense);
    const incomeValues = points.map((point) => point.income);
    // 两条折线共用纵轴上限，否则各自的峰值都顶到顶部，无法横向比较
    const max = Math.max(1, ...expenseValues, ...incomeValues);
    return {
      expense: lineGeometry(expenseValues, VIEW_WIDTH, height, PADDING, max),
      income: lineGeometry(incomeValues, VIEW_WIDTH, height, PADDING, max),
    };
  }, [points, height]);

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
          point: points[activeIndex],
          expense: expense.coords[activeIndex],
          income: income.coords[activeIndex],
        }
      : null;

  const tooltip = active
    ? tooltipPlacement({
        point: {
          x: active.expense.x,
          // 锚点取两条线中更靠上的点，浮层不遮挡折线
          y: Math.min(active.expense.y, active.income.y),
        },
        viewWidth: VIEW_WIDTH,
        viewHeight: height,
        containerWidth,
        containerHeight: height,
        tooltipWidth: tooltipSize.width,
        tooltipHeight: tooltipSize.height,
      })
    : null;

  return (
    <View>
      <View style={styles.legend}>
        {LEGEND.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View
        testID="trend-chart-plot"
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
          {expense.area ? (
            <Path d={expense.area} fill={EXPENSE_COLOR} opacity={AREA_OPACITY} />
          ) : null}
          {expense.points ? (
            <Polyline
              points={expense.points}
              fill="none"
              stroke={EXPENSE_COLOR}
              strokeWidth={2}
            />
          ) : null}
          {income.points ? (
            <Polyline points={income.points} fill="none" stroke={INCOME_COLOR} strokeWidth={2} />
          ) : null}

          {expense.coords.map((coord, index) =>
            index === activeIndex ? null : (
              <Circle
                key={`expense-${index}`}
                cx={coord.x}
                cy={coord.y}
                r={POINT_RADIUS}
                fill={EXPENSE_COLOR}
              />
            ),
          )}
          {income.coords.map((coord, index) =>
            index === activeIndex ? null : (
              <Circle
                key={`income-${index}`}
                cx={coord.x}
                cy={coord.y}
                r={POINT_RADIUS}
                fill={INCOME_COLOR}
              />
            ),
          )}

          {active ? (
            <>
              <Line
                testID="trend-guide"
                x1={active.expense.x}
                y1={PADDING / 2}
                x2={active.expense.x}
                y2={height - PADDING / 2}
                stroke={colors.textTertiary}
                strokeWidth={1}
                strokeDasharray={GUIDE_DASH}
              />
              <Circle
                testID="trend-active-expense"
                cx={active.expense.x}
                cy={active.expense.y}
                r={ACTIVE_POINT_RADIUS}
                fill={EXPENSE_COLOR}
                stroke={colors.card}
                strokeWidth={1.5}
              />
              <Circle
                testID="trend-active-income"
                cx={active.income.x}
                cy={active.income.y}
                r={ACTIVE_POINT_RADIUS}
                fill={INCOME_COLOR}
                stroke={colors.card}
                strokeWidth={1.5}
              />
            </>
          ) : null}
        </Svg>

        {active && tooltip ? (
          <TrendTooltip
            label={trendDayLabel(month, active.point.day)}
            expense={active.point.expense}
            income={active.point.income}
            currency={currency}
            left={tooltip.left}
            top={tooltip.top}
            onMeasure={handleTooltipMeasure}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = createStyles({
  legend: {
    flexDirection: 'row',
    gap: space(3),
    marginBottom: space(2),
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
});
