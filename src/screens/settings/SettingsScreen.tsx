import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MenuItem } from '@/components/MenuItem';
import { AppHeader } from '@/components/ui/AppHeader';
import { showAlert } from '@/lib/alert';
import type { RootStackParamList } from '@/navigation/types';
import { colors, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen = ({ navigation }: Props) => (
  <View style={styles.container}>
    <AppHeader title="设置" onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <MenuItem
        icon="cloud-upload-outline"
        label="数据备份"
        hint="云端自动同步"
        onPress={() => showAlert('提示', '账单数据已实时同步至云端，无需手动备份')}
      />
      <MenuItem
        icon="trash-outline"
        label="清除本地缓存"
        onPress={() =>
          showAlert('清除缓存', '将清除本地登录态与缓存，需要重新登录', [
            { text: '取消', style: 'cancel' },
            {
              text: '清除',
              style: 'destructive',
              onPress: () => {
                void AsyncStorage.clear().then(() => showAlert('已清除', '请重新登录'));
              },
            },
          ])
        }
      />
      <MenuItem
        icon="information-circle-outline"
        label="关于我们"
        onPress={() => navigation.navigate('About')}
      />
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    gap: space(2),
    padding: space(4),
  },
});
