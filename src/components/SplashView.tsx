import { ActivityIndicator, View } from 'react-native';

import { AppLogo } from '@/components/ui/AppLogo';
import { makeStyles, space, useColors } from '@/theme';

/** 登录态恢复期间的开屏页：应用图标 + 加载指示器 */
export const SplashView = () => {
  const styles = useStyles();
  const colors = useColors();

  return (
    <View style={styles.splash}>
      <AppLogo />
      <ActivityIndicator color={colors.primary} style={styles.spinner} />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  splash: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    flex: 1,
    justifyContent: 'center',
  },
  spinner: {
    marginTop: space(6),
  },
}));
