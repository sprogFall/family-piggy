import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

interface Props {
  message?: string;
  onRetry: () => void;
}

/**
 * 查询失败且没有可展示的缓存数据时的整屏兜底。
 *
 * 与 EmptyState 区分开：把「加载失败」渲染成「暂无数据」会让用户以为账本被清空了，
 * 所以这里必须给出明确的失败提示与重试入口。
 */
export const ErrorState = ({ message = '加载失败，请检查网络后重试', onRetry }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
      <Text style={styles.text}>{message}</Text>
      <PrimaryButton title="重试" onPress={onRetry} style={styles.retry} />
    </View>
  );
};

/**
 * 已有缓存可展示、但本次刷新失败时的轻量提示条：保留旧数据，同时提供重试。
 */
export const ErrorBanner = ({ message = '刷新失败，当前展示的是本地缓存', onRetry }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
      <Text style={styles.bannerText} numberOfLines={2}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="重试"
        hitSlop={8}
        onPress={onRetry}
      >
        <Text style={styles.bannerAction}>重试</Text>
      </Pressable>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space(2),
    paddingHorizontal: space(3),
    paddingVertical: space(2),
  },
  bannerAction: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  bannerText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: fontSize.sm,
  },
  container: {
    alignItems: 'center',
    gap: space(3),
    paddingVertical: space(12),
  },
  retry: {
    paddingHorizontal: space(8),
  },
  text: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
}));
