import { Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { DistributionList } from '@/components/DistributionList';
import { DonutChart } from '@/components/charts/DonutChart';
import type { CurrencyCode } from '@/domain/currency';
import { formatMoney } from '@/domain/money';
import type { DistributionItem, DistributionMode } from '@/domain/statement';
import { makeStyles, CHART_PALETTE, fontSize, space } from '@/theme';

import { StatsSectionTabs } from './StatsSectionTabs';
const MODE_ITEMS: { key: DistributionMode; label: string }[] = [
  { key: 'expense', label: '支出' },
  { key: 'income', label: '收入' },
  { key: 'all', label: '收支' },
];

interface Props {
  items: DistributionItem[];
  currency: CurrencyCode;
  mode: DistributionMode;
  onModeChange: (mode: DistributionMode) => void;
}

export const DistributionSection = ({ items, currency, mode, onModeChange }: Props) => {
  const styles = useStyles();
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>收支分类分布</Text>
        <StatsSectionTabs
          items={MODE_ITEMS}
          value={mode}
          onChange={onModeChange}
          accessibilityLabel="切换分布类型"
        />
      </View>

      {items.length > 0 ? (
        <>
          <View style={styles.donutWrap}>
            <DonutChart
              size={150}
              segments={items.map((item, index) => ({
                value: item.amount,
                color: CHART_PALETTE[index % CHART_PALETTE.length],
              }))}
              centerLabel={formatMoney(totalAmount, currency)}
              centerSub={`共 ${totalCount} 笔`}
            />
          </View>
          <DistributionList items={items} currency={currency} />
        </>
      ) : (
        <EmptyState icon="pie-chart-outline" message="当前周期暂无分布数据" />
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
  donutWrap: {
    alignItems: 'center',
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
