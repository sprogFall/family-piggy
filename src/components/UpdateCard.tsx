import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { formatBytes } from '@/domain/bytes';
import { toDisplayNotes } from '@/domain/release-notes';
import { useUpdateStore } from '@/stores/update.store';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

/** 下载进度百分比；总长度未知时返回 null（改为展示不确定态） */
const progressPercent = (received: number, total: number | null): number | null => {
  if (total === null || total <= 0) return null;
  return Math.min(100, Math.round((received / total) * 100));
};

/**
 * 关于页的「应用更新」卡片：检查 GitHub Release → 下载并校验 APK → 拉起系统安装器。
 *
 * 进入页面自动检查一次（hydrate 先读「已忽略版本」，避免忽略过的版本又被提示），
 * 之后由用户手动触发。
 */
export const UpdateCard = () => {
  const styles = useStyles();
  const colors = useColors();
  const status = useUpdateStore((state) => state.status);
  const release = useUpdateStore((state) => state.release);
  const currentVersion = useUpdateStore((state) => state.currentVersion);
  const receivedBytes = useUpdateStore((state) => state.receivedBytes);
  const totalBytes = useUpdateStore((state) => state.totalBytes);
  const verifiedBytes = useUpdateStore((state) => state.verifiedBytes);
  const message = useUpdateStore((state) => state.message);
  const hydrate = useUpdateStore((state) => state.hydrate);
  const check = useUpdateStore((state) => state.check);
  const download = useUpdateStore((state) => state.download);
  const install = useUpdateStore((state) => state.install);
  const openInstallSettings = useUpdateStore((state) => state.openInstallSettings);
  const ignoreCurrent = useUpdateStore((state) => state.ignoreCurrent);

  useEffect(() => {
    void (async () => {
      await hydrate();
      await check();
    })();
  }, [hydrate, check]);

  const percent = progressPercent(receivedBytes, totalBytes);
  // 校验阶段重新起算：下载已到 100%，再拿下载进度算校验百分比会永远是 0%
  const verifyPercent = progressPercent(verifiedBytes, totalBytes);
  const version = release?.version ?? '';

  const renderBody = () => {
    if (status === 'checking') {
      return (
        <View style={styles.inline}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.hint}>正在检查更新…</Text>
        </View>
      );
    }

    if (status === 'downloading') {
      return (
        <View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${percent ?? 10}%` }]} />
          </View>
          <Text style={styles.hint}>
            {percent === null ? '正在下载安装包…' : `正在下载 ${percent}%`}
            {totalBytes === null ? '' : `（${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)}）`}
          </Text>
        </View>
      );
    }

    // 仅 Release 显式提供 SHA256 时才会进入这里：进度条保持满格，
    // 另给校验进度与转圈，避免「下载 100%」后界面看起来卡住
    if (status === 'verifying') {
      return (
        <View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: '100%' }]} />
          </View>
          <View style={styles.inline}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.hint}>
              {verifyPercent === null ? '正在校验安装包…' : `正在校验安装包 ${verifyPercent}%`}
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'ready') {
      return (
        <View>
          <Text style={styles.hint}>安装包已下载完成，点击安装即可升级到 v{version}</Text>
          {message === null ? null : <Text style={styles.warning}>{message}</Text>}
          <PrimaryButton title="安装" onPress={() => void install()} style={styles.action} />
          {message === null ? null : (
            <Pressable accessibilityRole="button" onPress={() => void openInstallSettings()}>
              <Text style={styles.link}>去允许「安装未知应用」</Text>
            </Pressable>
          )}
        </View>
      );
    }

    if (status === 'available') {
      return (
        <View>
          <Text style={styles.version}>发现新版本 v{version}</Text>
          {release === null ? null : (
            <Text style={styles.notes}>{toDisplayNotes(release.notes)}</Text>
          )}
          <PrimaryButton title="立即更新" onPress={() => void download()} style={styles.action} />
          <Pressable accessibilityRole="button" onPress={() => void ignoreCurrent()}>
            <Text style={styles.link}>忽略此版本</Text>
          </Pressable>
        </View>
      );
    }

    if (status === 'upToDate') {
      return <Text style={styles.hint}>已是最新版本，无需更新</Text>;
    }

    if (status === 'ignored') {
      return (
        <View>
          <Text style={styles.hint}>已忽略 v{version} 的更新提示</Text>
          <Pressable accessibilityRole="button" onPress={() => void check({ force: true })}>
            <Text style={styles.link}>仍要查看</Text>
          </Pressable>
        </View>
      );
    }

    if (status === 'unavailable' || status === 'failed') {
      const canRetryDownload = status === 'failed' && release !== null;
      return (
        <View>
          <Text style={styles.warning}>{message ?? '暂时无法检查更新'}</Text>
          <PrimaryButton
            title={canRetryDownload ? '重试下载' : '重试'}
            onPress={() => void (canRetryDownload ? download() : check({ force: true }))}
            style={styles.action}
          />
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.hint}>检查是否有新版本可用</Text>
        <PrimaryButton title="检查更新" onPress={() => void check()} style={styles.action} />
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>应用更新</Text>
        <Text style={styles.current}>当前版本 v{currentVersion || '未知'}</Text>
      </View>
      {renderBody()}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  action: {
    marginTop: space(3),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginTop: space(6),
    padding: space(4),
    width: '100%',
  },
  current: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space(3),
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: space(1),
  },
  inline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(2),
  },
  link: {
    color: colors.primary,
    fontSize: fontSize.sm,
    marginTop: space(3),
    textAlign: 'center',
  },
  notes: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: space(2),
    padding: space(3),
  },
  progressBar: {
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 6,
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: radius.round,
    height: 6,
    marginTop: space(1),
    overflow: 'hidden',
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  version: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  warning: {
    color: colors.danger,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: space(2),
  },
}));
