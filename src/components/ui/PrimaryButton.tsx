import type { StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { makeStyles, useColors, fontSize, radius } from '@/theme';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
  style?: StyleProp<ViewStyle>;
}

export const PrimaryButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  /** 次级按钮用主色浅底 + 主色文字，与实心主按钮形成颜色区分 */
  const secondary = variant === 'secondary';
  const bg = disabled
    ? secondary
      ? colors.bg
      : colors.primaryDisabled
    : variant === 'danger'
      ? colors.danger
      : secondary
        ? colors.primaryLight
        : colors.primary;
  const contentColor = secondary ? colors.primary : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <Text style={[styles.title, secondary && styles.secondaryTitle]}>{title}</Text>
      )}
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  button: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 48,
    justifyContent: 'center',
  },
  secondaryTitle: {
    color: colors.primary,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
}));
