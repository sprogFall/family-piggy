import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { dayKeyOf } from '@/domain/dates';
import {
  periodFromCustom,
  periodFromMonth,
  periodFromPreset,
  periodFromWeekStart,
  periodFromYear,
  recentWeekStarts,
  recentYears,
  type PeriodPreset,
  type PeriodRange,
} from '@/domain/period';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

const QUICK_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'thisWeek', label: '本周' },
  { key: 'lastWeek', label: '上周' },
  { key: 'thisYear', label: '今年' },
  { key: 'lastYear', label: '去年' },
];

const SECONDARY_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'allTime', label: '全部时间' },
  { key: 'last30Days', label: '最近30天' },
];

type CustomMode = 'quick' | 'week' | 'month' | 'year' | 'custom';

const MODE_ITEMS: { key: CustomMode; label: string }[] = [
  { key: 'week', label: '按周查看' },
  { key: 'month', label: '按月查看' },
  { key: 'year', label: '按年查看' },
  { key: 'custom', label: '自定义' },
];

const ONE_DAY = 24 * 60 * 60 * 1000;

interface Props {
  visible: boolean;
  value: PeriodRange;
  onClose: () => void;
  onConfirm: (period: PeriodRange) => void;
}

export const TimePeriodSheet = ({ visible, value, onClose, onConfirm }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const now = useMemo(() => new Date(), []);
  const [draft, setDraft] = useState<PeriodRange>(value);
  const [mode, setMode] = useState<CustomMode>('month');
  const [calendarYear, setCalendarYear] = useState(() => new Date(value.start).getFullYear());
  const [customStart, setCustomStart] = useState(() => new Date(value.start));
  const [customEnd, setCustomEnd] = useState(() => new Date(new Date(value.end).getTime() - ONE_DAY));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const weeks = useMemo(() => recentWeekStarts(12, now), [now]);
  const years = useMemo(() => recentYears(12, now), [now]);

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    setCalendarYear(new Date(value.start).getFullYear());
    setCustomStart(new Date(value.start));
    setCustomEnd(new Date(new Date(value.end).getTime() - ONE_DAY));
  }, [visible, value]);

  const choosePreset = (preset: PeriodPreset) => {
    setDraft(periodFromPreset(preset, now));
    setMode('quick');
  };

  const chooseMonth = (year: number, month: number) => {
    setDraft(periodFromMonth({ year, month }));
  };

  const chooseWeek = (weekStart: Date) => {
    setDraft(periodFromWeekStart(weekStart));
  };

  const updateCustom = (start: Date, end: Date) => {
    setDraft(periodFromCustom(start, end));
  };

  const renderWeekPanel = () => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>按周查看</Text>
      <View style={styles.chipWrap}>
        {weeks.map((weekStart) => {
          const period = periodFromWeekStart(weekStart);
          const active = draft.key === period.key;
          return (
            <Pressable
              key={period.key}
              style={[styles.chip, styles.weekChip, active ? styles.chipActive : null]}
              onPress={() => chooseWeek(weekStart)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {period.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderMonthPanel = () => (
    <View style={styles.panel}>
      <View style={styles.yearRow}>
        <Pressable hitSlop={12} onPress={() => setCalendarYear((year) => year - 1)}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.yearLabel}>{calendarYear}年</Text>
        <Pressable hitSlop={12} onPress={() => setCalendarYear((year) => year + 1)}>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.monthGrid}>
        {Array.from({ length: 12 }, (_, index) => {
          const month = index + 1;
          const period = periodFromMonth({ year: calendarYear, month });
          const active = draft.key === period.key;
          return (
            <Pressable
              key={month}
              style={[styles.monthCell, active ? styles.chipActive : null]}
              onPress={() => chooseMonth(calendarYear, month)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {month}月
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderYearPanel = () => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>按年查看</Text>
      <View style={styles.chipWrap}>
        {years.map((year) => {
          const period = periodFromYear(year);
          const active = draft.key === period.key;
          return (
            <Pressable
              key={year}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => setDraft(periodFromYear(year))}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {year}年
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderCustomPanel = () => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>自定义日期</Text>
      <Pressable style={styles.dateRow} onPress={() => setShowStartPicker(true)}>
        <Text style={styles.dateLabel}>开始</Text>
        <Text style={styles.dateValue}>{dayKeyOf(customStart.toISOString())}</Text>
      </Pressable>
      <Pressable style={styles.dateRow} onPress={() => setShowEndPicker(true)}>
        <Text style={styles.dateLabel}>结束</Text>
        <Text style={styles.dateValue}>{dayKeyOf(customEnd.toISOString())}</Text>
      </Pressable>
      {showStartPicker ? (
        <DateTimePicker
          value={customStart}
          mode="date"
          onChange={(_event, date) => {
            setShowStartPicker(false);
            if (!date) return;
            const nextStart = date > customEnd ? customEnd : date;
            setCustomStart(nextStart);
            updateCustom(nextStart, customEnd);
          }}
        />
      ) : null}
      {showEndPicker ? (
        <DateTimePicker
          value={customEnd}
          mode="date"
          onChange={(_event, date) => {
            setShowEndPicker(false);
            if (!date) return;
            const nextEnd = date < customStart ? customStart : date;
            setCustomEnd(nextEnd);
            updateCustom(customStart, nextEnd);
          }}
        />
      ) : null}
    </View>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>时间周期</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="确定时间周期"
          hitSlop={10}
          onPress={() => {
            onConfirm(draft);
            onClose();
          }}
        >
          <Text style={styles.confirm}>确定</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.quickGrid}>
          {QUICK_PRESETS.map((item) => {
            const active = draft.key === periodFromPreset(item.key, now).key;
            return (
              <Pressable
                key={item.key}
                style={[styles.quickChip, active ? styles.chipActive : null]}
                onPress={() => choosePreset(item.key)}
              >
                <Text style={[styles.quickText, active ? styles.chipTextActive : null]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.secondaryRow}>
          {SECONDARY_PRESETS.map((item) => {
            const active = draft.key === periodFromPreset(item.key, now).key;
            return (
              <Pressable
                key={item.key}
                style={[styles.secondaryChip, active ? styles.chipActive : null]}
                onPress={() => choosePreset(item.key)}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.modeRow}>
          {MODE_ITEMS.map((item) => {
            const active = mode === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.modeChip, active ? styles.chipActive : null]}
                onPress={() => setMode(item.key)}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'week' ? renderWeekPanel() : null}
        {mode === 'month' ? renderMonthPanel() : null}
        {mode === 'year' ? renderYearPanel() : null}
        {mode === 'custom' ? renderCustomPanel() : null}
        {mode === 'quick' ? (
          <View style={styles.quickHint}>
            <Text style={styles.quickHintText}>已选择快捷周期，点击「确定」即可应用</Text>
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
};

const useStyles = makeStyles((colors) => ({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: space(2),
    paddingVertical: space(2),
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  confirm: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  dateLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  dateRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space(3),
  },
  dateValue: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space(2),
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modeChip: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    flex: 1,
    paddingVertical: space(2),
  },
  modeRow: {
    flexDirection: 'row',
    gap: space(2),
    marginTop: space(4),
  },
  monthCell: {
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingVertical: space(2),
    width: '25%',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: space(2),
  },
  panel: {
    marginTop: space(4),
  },
  panelTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginBottom: space(2),
  },
  quickChip: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingVertical: space(2.5),
    width: '30%',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(3),
  },
  quickHint: {
    alignItems: 'center',
    paddingVertical: space(6),
  },
  quickHintText: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
  },
  quickText: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  scroll: {
    maxHeight: 520,
  },
  secondaryChip: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    flex: 1,
    paddingVertical: space(2.5),
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(3),
  },
  weekChip: {
    minWidth: '46%',
  },
  yearLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  yearRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space(4),
  },
}));
