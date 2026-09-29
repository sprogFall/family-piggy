import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { makeStyles, useColors, fontSize, space } from '@/theme';

interface Props {
  year: number;
  onChange: (year: number) => void;
}

/** 统计页年份切换 */
export const YearSwitcher = ({ year, onChange }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Pressable hitSlop={10} onPress={() => onChange(year - 1)}>
        <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
      </Pressable>
      <Text style={styles.label}>{year}年</Text>
      <Pressable hitSlop={10} onPress={() => onChange(year + 1)}>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
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
}));
