import { ActivityIndicator, Text, View } from 'react-native';

import { makeStyles, useColors, fontSize, space } from '@/theme';

interface Props {
  message?: string;
}

/** 统一的查询加载态：避免数据未返回时把 0 / 空列表误认为业务数据 */
export const LoadingView = ({ message = '正在加载…' }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: space(3),
    justifyContent: 'center',
    minHeight: 180,
  },
  text: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
}));
