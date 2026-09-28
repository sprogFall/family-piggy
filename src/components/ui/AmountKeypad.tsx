import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pressAmountKey, type AmountKey } from '@/domain/amount-input';
import { makeStyles, useColors, fontSize } from '@/theme';

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
  submitLabel?: string;
}

const GRID_KEYS: AmountKey[] = [
  '7', '8', '9',
  '4', '5', '6',
  '1', '2', '3',
  '.', '0', 'backspace',
];

export const AmountKeypad = ({
  value,
  onChange,
  onSubmit,
  submitDisabled = false,
  submitLabel = '完成',
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {GRID_KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityLabel={key === 'backspace' ? 'backspace' : undefined}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            onPress={() => onChange(pressAmountKey(value, key))}
          >
            {key === 'backspace' ? (
              <Ionicons name="backspace-outline" size={24} color={colors.text} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
        disabled={submitDisabled}
        style={({ pressed }) => [
          styles.submit,
          submitDisabled && styles.submitDisabled,
          pressed && styles.keyPressed,
        ]}
        onPress={onSubmit}
      >
        <Text style={styles.submitText}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    backgroundColor: colors.card,
    flexDirection: 'row',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    height: 54,
    justifyContent: 'center',
    width: '33.33%',
  },
  keyPressed: {
    backgroundColor: colors.bg,
  },
  keyText: {
    color: colors.text,
    fontSize: fontSize.xl,
  },
  submit: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    width: 88,
  },
  submitDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  submitText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
}));
