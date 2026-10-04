import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AMOUNT_OPERATORS,
  pressAmountKey,
  type AmountKey,
  type AmountOperator,
} from '@/domain/amount-input';
import { makeStyles, useColors, fontSize } from '@/theme';

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
  submitLabel?: string;
  /** 记一笔页把提交按钮移到顶部操作区后，键盘只保留金额与运算符 */
  showSubmitButton?: boolean;
}

const GRID_KEYS: AmountKey[] = [
  '7', '8', '9',
  '4', '5', '6',
  '1', '2', '3',
  '.', '0', 'backspace',
];

const OPERATOR_ROWS: AmountOperator[][] = [
  [AMOUNT_OPERATORS[0], AMOUNT_OPERATORS[1]],
  [AMOUNT_OPERATORS[2], AMOUNT_OPERATORS[3]],
];

export const AmountKeypad = ({
  value,
  onChange,
  onSubmit,
  submitDisabled = false,
  submitLabel = '完成',
  showSubmitButton = true,
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

      {/* 右侧：加减乘除；需要时在右下角渲染提交按钮，无缝拼成一整列 */}
      <View style={styles.sidebar}>
        {OPERATOR_ROWS.map((row, rowIndex) => (
          <View key={`operator-row-${rowIndex}`} style={styles.operatorRow}>
            {row.map((operator) => (
              <Pressable
                key={operator}
                accessibilityRole="button"
                accessibilityLabel={`operator-${operator}`}
                style={({ pressed }) => [styles.operatorKey, pressed && styles.keyPressed]}
                onPress={() => onChange(pressAmountKey(value, operator))}
              >
                <Text style={styles.operatorText}>{operator}</Text>
              </Pressable>
            ))}
          </View>
        ))}

        {showSubmitButton ? (
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
        ) : null}
      </View>
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
  operatorKey: {
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
  },
  operatorRow: {
    flex: 1,
    flexDirection: 'row',
  },
  operatorText: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  sidebar: {
    width: 84,
  },
  submit: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 54,
    justifyContent: 'center',
    width: 84,
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
