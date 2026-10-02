import { Pressable, Text, View } from 'react-native';

import { makeStyles, fontSize, radius, space } from '@/theme';

interface Item<K extends string> {
  key: K;
  label: string;
}

interface Props<K extends string> {
  items: Item<K>[];
  value: K;
  onChange: (key: K) => void;
  accessibilityLabel?: string;
}

/** 统计卡片右上角的紧凑切换：标题下方短线表示选中态 */
export const StatsSectionTabs = <K extends string>({
  items,
  value,
  onChange,
  accessibilityLabel,
}: Props<K>) => {
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityLabel={accessibilityLabel}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.item}
            onPress={() => onChange(item.key)}
          >
            <Text style={[styles.label, active ? styles.active : null]}>{item.label}</Text>
            <View style={[styles.indicator, active ? styles.activeIndicator : null]} />
          </Pressable>
        );
      })}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  active: {
    color: colors.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    backgroundColor: colors.primary,
  },
  indicator: {
    alignSelf: 'center',
    borderRadius: radius.round,
    height: 2,
    marginTop: 3,
    width: 16,
  },
  item: {
    alignItems: 'center',
    marginLeft: space(3),
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
}));
