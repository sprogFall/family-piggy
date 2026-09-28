import type { ReactNode } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { createStyles, colors, fontSize, radius, space } from '@/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  right?: ReactNode;
}

export const TextField = ({ label, error, right, style, ...inputProps }: Props) => (
  <View>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <View style={[styles.field, error ? styles.fieldError : null]}>
      <TextInput
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, style]}
        {...inputProps}
      />
      {right}
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
);

const styles = createStyles({
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginTop: space(1),
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: space(3),
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: space(1),
  },
});
