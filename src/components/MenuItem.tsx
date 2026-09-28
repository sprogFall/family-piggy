import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

interface Props {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint?: string;
  danger?: boolean;
  onPress: () => void;
  right?: ReactNode;
}

export const MenuItem = ({ icon, label, hint, danger = false, onPress, right }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      <Text style={[styles.label, danger ? styles.danger : null]}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {right ?? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  danger: {
    color: colors.danger,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginRight: space(1),
  },
  label: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
    marginLeft: space(3),
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
  },
}));
