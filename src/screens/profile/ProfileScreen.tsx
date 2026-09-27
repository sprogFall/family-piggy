import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuItem } from '@/components/MenuItem';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { showAlert } from '@/lib/alert';
import { avatarService } from '@/services/avatar.service';
import { getErrorMessage } from '@/lib/errors';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { useAuthStore } from '@/stores/auth.store';
import { colors, fontSize, radius, space } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const ProfileScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const [uploading, setUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile().catch(() => undefined);
    }, []),
  );

  const email = session?.user.email ?? '';

  const pickAvatar = async () => {
    const userId = session?.user.id;
    if (!userId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];

    setUploading(true);
    try {
      await avatarService.upload(userId, asset.uri, asset.mimeType ?? 'image/jpeg');
      await refreshProfile();
      showAlert('头像已更新');
    } catch (error) {
      showAlert('上传失败', getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const confirmSignOut = () => {
    showAlert('退出登录', '确定退出当前账号吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space(6) }]}>
        <Pressable onPress={() => void pickAvatar()} disabled={uploading}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(profile?.nickname ?? '记').slice(0, 1)}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.cameraText}>改</Text>
            )}
          </View>
        </Pressable>
        <View style={styles.userMeta}>
          <Text style={styles.nickname}>{profile?.nickname ?? '未登录'}</Text>
          <Text style={styles.userId} numberOfLines={1}>
            {email || 'MY'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.menu} showsVerticalScrollIndicator={false}>
        <MenuItem
          icon="people-outline"
          label="家庭管理"
          hint="创建 / 加入家庭"
          onPress={() => navigation.navigate('FamilyHub')}
        />
        <MenuItem
          icon="wallet-outline"
          label="预算设置"
          onPress={() => navigation.navigate('Budget')}
        />
        <MenuItem
          icon="grid-outline"
          label="分类管理"
          onPress={() => navigation.navigate('CategoryManager')}
        />
        <MenuItem
          icon="download-outline"
          label="导出数据"
          onPress={() => navigation.navigate('Export')}
        />
        <MenuItem
          icon="document-text-outline"
          label="导入数据"
          onPress={() => navigation.navigate('Import')}
        />
        <MenuItem
          icon="settings-outline"
          label="设置"
          onPress={() => navigation.navigate('Settings')}
        />
        <MenuItem
          icon="information-circle-outline"
          label="关于我们"
          onPress={() => navigation.navigate('About')}
        />

        <PrimaryButton
          title="退出登录"
          variant="danger"
          onPress={confirmSignOut}
          style={styles.logout}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  cameraBadge: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radius.round,
    bottom: -2,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 22,
  },
  cameraText: {
    color: colors.white,
    fontSize: 10,
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(4),
    paddingBottom: space(6),
    paddingHorizontal: space(5),
  },
  menu: {
    gap: space(2),
    padding: space(4),
  },
  nickname: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  logout: {
    marginTop: space(4),
  },
  userId: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  userMeta: {
    flex: 1,
  },
});
