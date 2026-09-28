import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, ScrollView, Text, View } from 'react-native';

import { UpdateCard } from '@/components/UpdateCard';
import { AppHeader } from '@/components/ui/AppHeader';
import type { RootStackParamList } from '@/navigation/types';
import { makeStyles, fontSize, radius, space } from '@/theme';

import appIcon from '../../../assets/icon.png';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

export const AboutScreen = ({ navigation }: Props) => {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <AppHeader title="关于我们" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* 直接展示与启动器一致的应用图标，而不是绿底「¥」占位 */}
        <Image testID="about-app-icon" source={appIcon} style={styles.logo} resizeMode="cover" />
        <Text style={styles.name}>家庭记账</Text>
        <Text style={styles.desc}>
          一款支持个人账本与家庭账本的记账应用，多人实时共同记账，数据云端同步，让每一笔收支都清晰可见。
        </Text>
        {/* 版本号与更新入口统一由卡片展示（版本来自 app.config.js，发布时由 CI 的 tag 注入） */}
        <UpdateCard />
      </ScrollView>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingBottom: space(8),
    paddingHorizontal: space(5),
    paddingTop: space(10),
  },
  desc: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22,
    marginTop: space(6),
    textAlign: 'center',
  },
  logo: {
    borderRadius: radius.lg,
    height: 72,
    overflow: 'hidden',
    width: 72,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: space(4),
  },
}));
