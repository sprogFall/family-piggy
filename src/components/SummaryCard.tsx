import { StyleSheet, Text, View } from 'react-native';

import { formatCents } from '@/domain/money';
import { colors, fontSize, space } from '@/theme';

interface Props {
  expense: number;
  income: number;
  balance: number;
}

export const SummaryCard = ({ expense, income, balance }: Props) => (
  <View style={styles.card}>
    <Text style={styles.label}>本月支出(元)</Text>
    <Text style={styles.expense}>{formatCents(expense)}</Text>
    <View style={styles.row}>
      <View style={styles.item}>
        <Text style={styles.subLabel}>本月收入(元)</Text>
        <Text style={styles.subValue}>{formatCents(income)}</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.subLabel}>结余(元)</Text>
        <Text style={styles.subValue}>{formatCents(balance, { signed: true })}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: space(5),
  },
  expense: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    marginTop: space(1),
  },
  item: {
    flex: 1,
  },
  label: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: fontSize.sm,
  },
  row: {
    flexDirection: 'row',
    marginTop: space(4),
  },
  subLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: fontSize.sm,
  },
  subValue: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: 2,
  },
});
