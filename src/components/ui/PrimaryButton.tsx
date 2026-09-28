import type { StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { createStyles, colors, fontSize, radius } from '@/theme';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'danger';
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
  const bg = disabled
    ? colors.primaryDisabled
    : variant === 'danger'
      ? colors.danger
      : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = createStyles({
  button: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 48,
    justifyContent: 'center',
  },
  title: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
