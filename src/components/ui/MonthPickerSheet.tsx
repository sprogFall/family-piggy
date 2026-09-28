import { Pressable, ScrollView, Text } from 'react-native';

import { currentMonth, monthLabel, recentMonths, type MonthRef } from '@/domain/dates';
import { createStyles, colors, fontSize, space } from '@/theme';

import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  value: MonthRef;
  onSelect: (month: MonthRef) => void;
}

export const MonthPickerSheet = ({ visible, onClose, value, onSelect }: Props) => {
  const months = recentMonths(24, currentMonth());
  return (
    <BottomSheet visible={visible} onClose={onClose} title="选择月份">
      <ScrollView style={styles.list}>
        {months.map((month) => {
          const active = month.year === value.year && month.month === value.month;
          return (
            <Pressable
              key={`${month.year}-${month.month}`}
              style={styles.item}
              onPress={() => {
                onSelect(month);
                onClose();
              }}
            >
              <Text style={[styles.itemText, active ? styles.active : null]}>
                {monthLabel(month)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
};

const styles = createStyles({
  active: {
    color: colors.primary,
    fontWeight: '600',
  },
  item: {
    paddingVertical: space(3),
  },
  itemText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  list: {
    marginBottom: space(2),
  },
});
