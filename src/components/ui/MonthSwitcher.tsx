import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { monthLabel, type MonthRef } from '@/domain/dates';
import { colors, fontSize, space } from '@/theme';

interface Props {
  month: MonthRef;
  onChange: (month: MonthRef) => void;
}

export const MonthSwitcher = ({ month, onChange }: Props) => (
  <View style={styles.row}>
    <Pressable hitSlop={10} onPress={() => onChange({ year: month.year, month: month.month - 1 })}>
      <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
    </Pressable>
    <Text style={styles.label}>{monthLabel(month)}</Text>
    <Pressable hitSlop={10} onPress={() => onChange({ year: month.year, month: month.month + 1 })}>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
    marginHorizontal: space(2),
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
