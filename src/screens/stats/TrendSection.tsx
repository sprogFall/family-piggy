import { Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import type { CurrencyCode } from '@/domain/currency';
import { StatsTrendChart, type TrendChartType, type TrendSeriesMode } from '@/components/charts/StatsTrendChart';
import type { RangeTrendPoint } from '@/domain/statement';
import { makeStyles, fontSize, space } from '@/theme';

import { StatsSectionTabs } from './StatsSectionTabs';
const SERIES_ITEMS: { key: TrendSeriesMode; label: string }[] = [
  { key: 'expense', label: '支出' },
  { key: 'income', label: '收入' },
  { key: 'balance', label: '结余' },
  { key: 'both', label: '收支' },
];

const CHART_ITEMS: { key: TrendChartType; label: string }[] = [
  { key: 'bar', label: '柱状' },
  { key: 'line', label: '曲线' },
];

interface Props {
  points: RangeTrendPoint[];
  currency: CurrencyCode;
  mode: TrendSeriesMode;
  chartType: TrendChartType;
  onModeChange: (mode: TrendSeriesMode) => void;
  onChartTypeChange: (chartType: TrendChartType) => void;
}

export const TrendSection = ({
  points,
  currency,
  mode,
  chartType,
  onModeChange,
  onChartTypeChange,
}: Props) => {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>收支趋势</Text>
        <StatsSectionTabs
          items={SERIES_ITEMS}
          value={mode}
          onChange={onModeChange}
          accessibilityLabel="切换趋势指标"
        />
      </View>

      <View style={styles.chartToggle}>
        <StatsSectionTabs
          items={CHART_ITEMS}
          value={chartType}
          onChange={onChartTypeChange}
          accessibilityLabel="切换图表类型"
        />
      </View>

      {points.length > 0 ? (
        <StatsTrendChart
          points={points}
          currency={currency}
          mode={mode}
          chartType={chartType}
        />
      ) : (
        <EmptyState icon="stats-chart-outline" message="当前周期暂无趋势数据" />
      )}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: space(3),
    padding: space(4),
  },
  chartToggle: {
    alignItems: 'flex-start',
    marginBottom: space(3),
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space(3),
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
}));
