import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  CURRENCY_CODES,
  CURRENCY_META,
  currencyLabel,
  type CurrencyCode,
} from '@/domain/currency';
import { makeStyles, useColors, fontSize, space } from '@/theme';

import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  value: CurrencyCode;
  onSelect: (code: CurrencyCode) => void;
}

/** 币种选择：记一笔页面顶部左侧的「CNY ⌄」点开后弹出 */
export const CurrencyPickerSheet = ({ visible, onClose, value, onSelect }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="选择币种">
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {CURRENCY_CODES.map((code) => {
          const active = code === value;
          return (
            <Pressable
              key={code}
              style={styles.item}
              onPress={() => {
                onSelect(code);
                onClose();
              }}
            >
              <Text style={styles.symbol}>{CURRENCY_META[code].symbol}</Text>
              <Text style={[styles.itemText, active ? styles.active : null]}>
                {currencyLabel(code)}
              </Text>
              {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
};

const useStyles = makeStyles((colors) => ({
  active: {
    color: colors.primary,
    fontWeight: '600',
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(3),
    paddingVertical: space(3),
  },
  itemText: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
  },
  list: {
    marginBottom: space(2),
  },
  symbol: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    width: 40,
  },
}));
