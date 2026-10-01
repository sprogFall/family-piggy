import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  formatRecurringSchedule,
  MONTHLY_DAY_OPTIONS,
  RECURRING_WEEKDAY_LABELS,
} from '@/domain/recurring';
import type { RecurringFrequency, RecurringSchedule } from '@/types/domain';
import { fontSize, makeStyles, radius, space } from '@/theme';

import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './PrimaryButton';
import { SegmentedTabs } from './SegmentedTabs';

interface Props {
  visible: boolean;
  value: RecurringSchedule | null;
  onClose: () => void;
  onConfirm: (schedule: RecurringSchedule) => void;
}

const FREQUENCY_TABS = [
  { key: 'monthly' as const, label: '每月' },
  { key: 'weekly' as const, label: '每周' },
];

const DEFAULT_MONTHLY_DAY = 10;
const DEFAULT_WEEKLY_DAY = 1;

export const RecurringScheduleSheet = ({ visible, value, onClose, onConfirm }: Props) => {
  const styles = useStyles();
  const [frequency, setFrequency] = useState<RecurringFrequency>(value?.frequency ?? 'monthly');
  const [monthlyDay, setMonthlyDay] = useState(
    value?.frequency === 'monthly' ? value.monthlyDay : DEFAULT_MONTHLY_DAY,
  );
  const [weeklyDay, setWeeklyDay] = useState(
    value?.frequency === 'weekly' ? value.weeklyDay : DEFAULT_WEEKLY_DAY,
  );

  useEffect(() => {
    if (!visible) return;
    if (!value) {
      setFrequency('monthly');
      setMonthlyDay(DEFAULT_MONTHLY_DAY);
      setWeeklyDay(DEFAULT_WEEKLY_DAY);
      return;
    }
    if (value.frequency === 'monthly') {
      setFrequency('monthly');
      setMonthlyDay(value.monthlyDay);
      return;
    }
    setFrequency('weekly');
    setWeeklyDay(value.weeklyDay);
  }, [value, visible]);

  const schedule: RecurringSchedule =
    frequency === 'monthly'
      ? { frequency: 'monthly', monthlyDay }
      : { frequency: 'weekly', weeklyDay };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="选择定时时间">
      <SegmentedTabs items={FREQUENCY_TABS} value={frequency} onChange={setFrequency} />

      {frequency === 'monthly' ? (
        <ScrollView
          style={styles.dayScroll}
          contentContainerStyle={styles.dayGrid}
          showsVerticalScrollIndicator={false}
        >
          {MONTHLY_DAY_OPTIONS.map((day) => {
            const selected = day === monthlyDay;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`每月${day}号`}
                accessibilityState={{ selected }}
                style={[styles.dayChip, selected ? styles.dayChipSelected : null]}
                onPress={() => setMonthlyDay(day)}
              >
                <Text style={[styles.dayText, selected ? styles.dayTextSelected : null]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.weekRow}>
          {RECURRING_WEEKDAY_LABELS.map((label, index) => {
            const selected = index === weeklyDay;
            return (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`每周${label}`}
                accessibilityState={{ selected }}
                style={[styles.weekChip, selected ? styles.weekChipSelected : null]}
                onPress={() => setWeeklyDay(index)}
              >
                <Text style={[styles.weekText, selected ? styles.weekTextSelected : null]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.preview}>已选择：{formatRecurringSchedule(schedule)}</Text>
      <PrimaryButton title="确定" onPress={() => onConfirm(schedule)} />
    </BottomSheet>
  );
};

const useStyles = makeStyles((colors) => ({
  dayChip: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: '13.2%',
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(1.5),
    paddingVertical: space(3),
  },
  dayScroll: {
    maxHeight: 260,
  },
  dayText: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  preview: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: space(3),
    textAlign: 'center',
  },
  weekChip: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  weekChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekRow: {
    flexDirection: 'row',
    gap: space(1),
    paddingVertical: space(4),
  },
  weekText: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  weekTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
}));
