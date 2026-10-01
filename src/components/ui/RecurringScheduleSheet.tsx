import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import {
  formatRecurringSchedule,
  MONTHLY_DAY_OPTIONS,
  RECURRING_WEEKDAY_LABELS,
} from '@/domain/recurring';
import type { RecurringFrequency, RecurringSchedule } from '@/types/domain';
import { fontSize, makeStyles, space } from '@/theme';

import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './PrimaryButton';
import { WheelPicker, type WheelPickerOption } from './WheelPicker';

interface Props {
  visible: boolean;
  value: RecurringSchedule | null;
  onClose: () => void;
  onConfirm: (schedule: RecurringSchedule) => void;
}

const FREQUENCY_OPTIONS: WheelPickerOption<RecurringFrequency>[] = [
  { label: '每月', value: 'monthly' },
  { label: '每周', value: 'weekly' },
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

  const dayOptions: WheelPickerOption<number>[] =
    frequency === 'monthly'
      ? MONTHLY_DAY_OPTIONS.map((day) => ({ label: `${day}号`, value: day }))
      : RECURRING_WEEKDAY_LABELS.map((label, index) => ({ label: `周${label}`, value: index }));

  const selectedDay = frequency === 'monthly' ? monthlyDay : weeklyDay;
  const schedule: RecurringSchedule =
    frequency === 'monthly'
      ? { frequency: 'monthly', monthlyDay }
      : { frequency: 'weekly', weeklyDay };

  const changeDay = (next: number) => {
    if (frequency === 'monthly') {
      setMonthlyDay(next);
      return;
    }
    setWeeklyDay(next);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="选择定时时间">
      <View style={styles.wheelHeader}>
        <Text style={styles.wheelHeaderText}>频率</Text>
        <Text style={styles.wheelHeaderText}>日期</Text>
      </View>

      <View style={styles.wheelRow}>
        <WheelPicker
          options={FREQUENCY_OPTIONS}
          value={frequency}
          onChange={setFrequency}
          testID="recurring-frequency-wheel"
        />
        <View style={styles.wheelDivider} />
        <WheelPicker
          options={dayOptions}
          value={selectedDay}
          onChange={changeDay}
          testID="recurring-day-wheel"
        />
      </View>

      <Text style={styles.preview}>已选择：{formatRecurringSchedule(schedule)}</Text>
      <PrimaryButton title="确定" onPress={() => onConfirm(schedule)} />
    </BottomSheet>
  );
};

const useStyles = makeStyles((colors) => ({
  preview: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: space(3),
    textAlign: 'center',
  },
  wheelDivider: {
    backgroundColor: colors.border,
    width: 1,
  },
  wheelHeader: {
    flexDirection: 'row',
    marginTop: space(2),
  },
  wheelHeaderText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  wheelRow: {
    flexDirection: 'row',
    gap: space(2),
    marginBottom: space(3),
    marginTop: space(1),
  },
}));
