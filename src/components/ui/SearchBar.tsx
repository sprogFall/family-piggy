import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

/** 通用搜索框：账单页按分类 / 标签搜索 */
export const SearchBar = ({ value, onChangeText, placeholder = '搜索分类或标签' }: Props) => {
  const styles = useStyles();
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={17} color={colors.textTertiary} />
      <TextInput
        accessibilityLabel="搜索"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="search"
        style={styles.input}
      />
      {value !== '' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="清除搜索"
          hitSlop={8}
          onPress={() => onChangeText('')}
        >
          <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space(2),
    marginHorizontal: space(4),
    marginVertical: space(2),
    paddingHorizontal: space(3),
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.sm,
    paddingVertical: space(2),
  },
}));
