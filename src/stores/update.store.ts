import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { isNewerVersion } from '@/domain/app-version';
import { getErrorMessage } from '@/lib/errors';
import * as updateService from '@/services/update.service';
import type { AppRelease } from '@/types/domain';

/** 忽略的版本号本地持久化 key */
const STORAGE_KEY = 'update:ignoredVersion';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'upToDate'
  | 'available'
  | 'ignored'
  | 'unavailable'
  | 'downloading'
  /** Release 显式提供 SHA256 时，下载完成后的分块哈希校验状态 */
  | 'verifying'
  | 'ready'
  | 'failed';

interface UpdateState {
  status: UpdateStatus;
  /** 查到的最新正式版本（upToDate / available / ignored 时都有值） */
  release: AppRelease | null;
  /** 当前安装版本（来自 app.config.js） */
  currentVersion: string;
  receivedBytes: number;
  totalBytes: number | null;
  /** 已校验字节数（仅 Release 提供 SHA256 时在 verifying 期间展示） */
  verifiedBytes: number;
  /** 下载完成的本地文件 URI */
  localUri: string | null;
  /** 失败原因或操作提示 */
  message: string | null;
  /** 用户已忽略的版本号 */
  ignoredVersion: string | null;
  /** 启动时读取本地忽略记录 */
  hydrate: () => Promise<void>;
  /** 检查更新；`force` 用于忽略该版本后仍想手动查看 */
  check: (options?: { force?: boolean }) => Promise<void>;
  /** 下载安装包；若 Release 提供 SHA256 则额外做哈希校验 */
  download: () => Promise<void>;
  /** 拉起系统安装器 */
  install: () => Promise<void>;
  /** 跳转「安装未知应用」授权页 */
  openInstallSettings: () => Promise<void>;
  /** 忽略当前查到的版本 */
  ignoreCurrent: () => Promise<void>;
  /** 回到初始状态（离开页面或重试） */
  reset: () => void;
}

const idleState = {
  status: 'idle' as UpdateStatus,
  release: null,
  receivedBytes: 0,
  totalBytes: null,
  verifiedBytes: 0,
  localUri: null,
  message: null,
};

export const useUpdateStore = create<UpdateState>((set, get) => ({
  ...idleState,
  // 首屏即可展示当前版本，避免卡片先闪一下「未知」
  currentVersion: updateService.getCurrentVersion(),
  ignoredVersion: null,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({ ignoredVersion: stored, currentVersion: updateService.getCurrentVersion() });
    } catch {
      set({ ignoredVersion: null, currentVersion: updateService.getCurrentVersion() });
    }
  },

  check: async (options) => {
    const { status } = get();
    // 检查/下载/校验进行中重复点击不叠加请求
    if (status === 'checking' || status === 'downloading' || status === 'verifying') return;

    const currentVersion = updateService.getCurrentVersion();
    set({ status: 'checking', message: null, currentVersion });

    try {
      const release = await updateService.fetchLatestRelease();

      if (release === null) {
        set({
          ...idleState,
          status: 'unavailable',
          currentVersion,
          message: '暂时无法获取更新信息（仓库需为公开且已有 Release）',
        });
        return;
      }

      if (!isNewerVersion(release.version, currentVersion)) {
        set({ ...idleState, status: 'upToDate', currentVersion, release });
        return;
      }

      if (options?.force !== true && release.version === get().ignoredVersion) {
        set({ ...idleState, status: 'ignored', currentVersion, release });
        return;
      }

      set({ ...idleState, status: 'available', currentVersion, release });
    } catch (error) {
      set({ ...idleState, status: 'failed', currentVersion, message: getErrorMessage(error) });
    }
  },

  download: async () => {
    const { release, status } = get();
    if (release === null || (status !== 'available' && status !== 'failed')) return;

    set({
      status: 'downloading',
      receivedBytes: 0,
      totalBytes: release.apkSize,
      localUri: null,
      message: null,
    });

    try {
      const uri = await updateService.downloadApk(release, (progress) => {
        set({ receivedBytes: progress.received, totalBytes: progress.total ?? release.apkSize });
      });

      // 只有 Release 显式提供 SHA256 时才进入哈希校验状态；默认发布策略只校验
      // 资产大小，APK 篡改由 Android 安装器校验签名。
      const hasSha256 = release.sha256 !== null;
      if (hasSha256) {
        set({ status: 'verifying', verifiedBytes: 0 });
      }
      await updateService.verifyDownloadedApk(
        release,
        uri,
        hasSha256 ? (progress) => set({ verifiedBytes: progress.hashed }) : undefined,
      );

      set({
        status: 'ready',
        localUri: uri,
        receivedBytes: release.apkSize ?? get().receivedBytes,
        verifiedBytes: release.apkSize ?? get().verifiedBytes,
        message: null,
      });
    } catch (error) {
      set({ status: 'failed', localUri: null, verifiedBytes: 0, message: getErrorMessage(error) });
    }
  },

  install: async () => {
    const { localUri } = get();
    if (localUri === null) return;

    try {
      await updateService.installApk(localUri);
      set({ message: null });
    } catch {
      // 绝大多数情况是系统未授予「安装未知应用」权限，引导用户去授权后重试
      set({
        status: 'ready',
        message: '安装失败：请先允许本应用「安装未知应用」，再点安装',
      });
    }
  },

  openInstallSettings: async () => {
    try {
      await updateService.openInstallPermissionSettings();
    } catch (error) {
      set({ message: getErrorMessage(error) });
    }
  },

  ignoreCurrent: async () => {
    const { release } = get();
    if (release === null) return;

    set({ status: 'ignored', ignoredVersion: release.version, message: null });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, release.version);
    } catch {
      // 持久化失败只影响下次启动的提示，不阻塞本次操作
    }
  },

  reset: () => {
    set({ ...idleState });
  },
}));
