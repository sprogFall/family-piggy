import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { Text, View } from 'react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import type { RootStackParamList } from '@/navigation/types';
import { createStyles, colors, fontSize, radius, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

/** 版本号来自 app.config.js（发布时由 CI 的 tag 注入 APP_VERSION），避免与发布版本脱节 */
const version = Constants.expoConfig?.version ?? '';

export const AboutScreen = ({ navigation }: Props) => (
  <View style={styles.container}>
    <AppHeader title="关于我们" onBack={() => navigation.goBack()} />
    <View style={styles.content}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>¥</Text>
      </View>
      <Text style={styles.name}>家庭记账</Text>
      <Text style={styles.version}>Version {version || 'unknown'}</Text>
      <Text style={styles.desc}>
        一款支持个人账本与家庭账本的记账应用，多人实时共同记账，数据云端同步，让每一笔收支都清晰可见。
      </Text>
    </View>
  </View>
);

const styles = createStyles({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: space(8),
    paddingTop: space(12),
  },
  desc: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22,
    marginTop: space(6),
    textAlign: 'center',
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  logoText: {
    color: colors.white,
    fontSize: 36,
    fontWeight: '700',
  },
  name: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: space(4),
  },
  version: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: space(1),
  },
});
