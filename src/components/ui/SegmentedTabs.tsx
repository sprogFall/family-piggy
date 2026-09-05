import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, space } from '@/theme';

interface Item<K extends string> {
  key: K;
  label: string;
}

interface Props<K extends string> {
  items: Item<K>[];
  value: K;
  onChange: (key: K) => void;
}

export const SegmentedTabs = <K extends string>({ items, value, onChange }: Props<K>) => (
  <View style={styles.row}>
    {items.map((item) => {
      const active = item.key === value;
      return (
        <Pressable key={item.key} style={styles.item} onPress={() => onChange(item.key)}>
          <Text style={[styles.label, active ? styles.activeText : null]}>{item.label}</Text>
          <View style={[styles.indicator, active ? styles.activeIndicator : null]} />
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  activeIndicator: {
    backgroundColor: colors.primary,
  },
  activeText: {
    color: colors.primary,
    fontWeight: '600',
  },
  indicator: {
    alignSelf: 'center',
    borderRadius: radius.round,
    height: 2,
    marginTop: space(1),
    width: 20,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: space(2),
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  row: {
    backgroundColor: colors.card,
    flexDirection: 'row',
  },
});
