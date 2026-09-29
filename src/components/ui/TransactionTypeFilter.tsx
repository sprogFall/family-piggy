import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  TRANSACTION_TYPE_FILTER_OPTIONS,
  type TransactionTypeFilterValue,
} from '@/domain/transaction-filter';
import { fontSize, makeStyles, radius, space } from '@/theme';

interface Props {
  value: TransactionTypeFilterValue;
  onChange: (value: TransactionTypeFilterValue) => void;
}

/** 账单列表的记账类型筛选：横向滚动胶囊，后续新增类型直接扩展选项数组。 */
export const TransactionTypeFilter = ({ value, onChange }: Props) => {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={styles.label}>记账类型</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.options}
      >
        {TRANSACTION_TYPE_FILTER_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  chip: {
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    paddingHorizontal: space(3),
    paddingVertical: space(1),
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space(2),
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  options: {
    gap: space(2),
    paddingRight: space(2),
  },
  scroll: {
    flex: 1,
  },
}));
