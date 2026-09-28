import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, space } from '@/theme';

interface Props {
  children: ReactNode;
}

/**
 * 页面顶部栏容器：统一预留状态栏安全区，两端内容左右对齐。
 * Android 状态栏为半透明（内容绘制在其下方），顶部栏必须自行空出 insets.top。
 */
export const ScreenTopBar = ({ children }: Props) => {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingTop: insets.top + space(3) }]}>{children}</View>;
};

const useStyles = makeStyles((colors) => ({
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: space(3),
    paddingHorizontal: space(4),
  },
}));
