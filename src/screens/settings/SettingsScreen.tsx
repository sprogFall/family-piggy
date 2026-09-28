import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, Text, View } from 'react-native';

import { MenuItem } from '@/components/MenuItem';
import { AppHeader } from '@/components/ui/AppHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { formatCents } from '@/domain/money';
import { showAlert } from '@/lib/alert';
import type { RootStackParamList } from '@/navigation/types';
import { useSettingsStore } from '@/stores/settings.store';
import {
  createStyles,
  colors,
  FONT_SCALE_KEYS,
  FONT_SCALE_LABELS,
  fontSize,
  radius,
  space,
} from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const FONT_SCALE_ITEMS = FONT_SCALE_KEYS.map((key) => ({ key, label: FONT_SCALE_LABELS[key] }));

/** 预览样例金额（分）：仅用于展示字号效果，不参与任何记账数据 */
export const PREVIEW_AMOUNT_CENTS = 236800;

export const SettingsScreen = ({ navigation }: Props) => {
  const fontScale = useSettingsStore((state) => state.fontScale);
  const setFontScale = useSettingsStore((state) => state.setFontScale);

  return (
    <View style={styles.container}>
      <AppHeader title="设置" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>字体大小</Text>
          <SegmentedTabs items={FONT_SCALE_ITEMS} value={fontScale} onChange={setFontScale} />
          <Text style={styles.previewHint}>切换后立即生效，无需重启 App</Text>
          <View style={styles.previewCard}>
            <Text testID="settings-preview-title" style={styles.previewTitle}>
              预览效果
            </Text>
            <Text testID="settings-preview-amount" style={styles.previewAmount}>
              {formatCents(PREVIEW_AMOUNT_CENTS)}
            </Text>
            <Text testID="settings-preview-label" style={styles.previewLabel}>
              餐饮 · 家庭账本
            </Text>
            <Text testID="settings-preview-secondary" style={styles.previewSecondary}>
              本月全部账单都会按当前档位显示
            </Text>
          </View>
        </View>

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
};

const styles = createStyles({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingBottom: space(4),
    paddingTop: space(2),
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    paddingHorizontal: space(4),
    paddingTop: space(2),
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    gap: space(2),
    padding: space(4),
  },
  previewAmount: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  /** 样例卡片：标题 / 金额 / 正文标签 / 次要说明四档字号，一眼看出档位差异 */
  previewCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    gap: space(1),
    marginHorizontal: space(4),
    padding: space(3),
  },
  previewHint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    paddingHorizontal: space(4),
    paddingTop: space(2),
  },
  previewLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  previewSecondary: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  previewTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
