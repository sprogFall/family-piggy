import AsyncStorage from '@react-native-async-storage/async-storage';

import * as updateService from '@/services/update.service';
import type { AppRelease } from '@/types/domain';

import { useUpdateStore } from './update.store';

jest.mock('@/services/update.service');

const mocked = updateService as jest.Mocked<typeof updateService>;

const release: AppRelease = {
  tagName: 'v0.1.7',
  version: '0.1.7',
  title: '家庭记账 v0.1.7',
  notes: '说明',
  pageUrl: 'https://github.com/sprogFall/family-piggy/releases/tag/v0.1.7',
  apkUrl: 'https://github.com/a.apk',
  apkSize: 200,
  sha256: 'a'.repeat(64),
  mirrors: [],
  publishedAt: null,
};

const STORAGE_KEY = 'update:ignoredVersion';

describe('useUpdateStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // reset 只清瞬态状态，忽略版本属于本地持久化偏好，测试里显式重置
    useUpdateStore.setState({ ignoredVersion: null });
    useUpdateStore.getState().reset();
    // clearAllMocks 保留 AsyncStorage 的 mock 实现（resetAllMocks 会把存储本身清成 no-op），
    // 因此只显式重置被替换实现的 service 函数，避免上个用例的 mockRejectedValue 泄漏
    jest.clearAllMocks();
    mocked.fetchLatestRelease.mockReset();
    mocked.downloadApk.mockReset();
    mocked.verifyDownloadedApk.mockReset();
    mocked.installApk.mockReset();
    mocked.openInstallPermissionSettings.mockReset();
    mocked.getCurrentVersion.mockReturnValue('0.1.6');
  });

  describe('check', () => {
    it('发现新版本时进入 available 并带上 Release 信息', async () => {
      mocked.fetchLatestRelease.mockResolvedValue(release);

      await useUpdateStore.getState().check();

      const state = useUpdateStore.getState();
      expect(state.status).toBe('available');
      expect(state.release).toEqual(release);
      expect(state.currentVersion).toBe('0.1.6');
      expect(state.message).toBeNull();
    });

    it('同版本为 upToDate', async () => {
      mocked.fetchLatestRelease.mockResolvedValue({ ...release, version: '0.1.6' });

      await useUpdateStore.getState().check();

      expect(useUpdateStore.getState().status).toBe('upToDate');
    });

    it('拿不到更新信息（仓库未公开 / 尚无 Release）时给出可读提示', async () => {
      mocked.fetchLatestRelease.mockResolvedValue(null);

      await useUpdateStore.getState().check();

      const state = useUpdateStore.getState();
      expect(state.status).toBe('unavailable');
      expect(state.message).toContain('暂时无法获取更新信息');
    });

    it('请求失败时进入 failed 并保留错误文案', async () => {
      mocked.fetchLatestRelease.mockRejectedValue(new Error('检查更新失败（HTTP 500）'));

      await useUpdateStore.getState().check();

      const state = useUpdateStore.getState();
      expect(state.status).toBe('failed');
      expect(state.message).toBe('检查更新失败（HTTP 500）');
    });

    it('被忽略的版本不再提示，强制检查时仍然提示', async () => {
      mocked.fetchLatestRelease.mockResolvedValue(release);
      await useUpdateStore.getState().check();
      await useUpdateStore.getState().ignoreCurrent();

      await useUpdateStore.getState().check();
      expect(useUpdateStore.getState().status).toBe('ignored');

      await useUpdateStore.getState().check({ force: true });
      expect(useUpdateStore.getState().status).toBe('available');
    });

    it('检查中重复触发不会叠加请求', async () => {
      mocked.fetchLatestRelease.mockResolvedValue(release);

      await Promise.all([useUpdateStore.getState().check(), useUpdateStore.getState().check()]);

      expect(mocked.fetchLatestRelease).toHaveBeenCalledTimes(1);
    });
  });

  describe('ignoreCurrent', () => {
    it('写入本地存储并可 hydrate 读回', async () => {
      mocked.fetchLatestRelease.mockResolvedValue(release);
      await useUpdateStore.getState().check();
      await useUpdateStore.getState().ignoreCurrent();

      expect(useUpdateStore.getState().ignoredVersion).toBe('0.1.7');
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('0.1.7');

      useUpdateStore.getState().reset();
      await useUpdateStore.getState().hydrate();
      expect(useUpdateStore.getState().ignoredVersion).toBe('0.1.7');
    });
  });

  describe('download', () => {
    it('透传进度，下载校验通过后进入 ready 并记录本地路径', async () => {
      mocked.fetchLatestRelease.mockResolvedValue(release);
      mocked.downloadApk.mockImplementation(async (_release, onProgress) => {
        onProgress?.({ received: 50, total: 200 });
        onProgress?.({ received: 200, total: 200 });
        return 'file:///local/app.apk';
      });

      await useUpdateStore.getState().check();
      await useUpdateStore.getState().download();

      const state = useUpdateStore.getState();
      expect(state.status).toBe('ready');
      expect(state.localUri).toBe('file:///local/app.apk');
      expect(state.receivedBytes).toBe(200);
      expect(state.totalBytes).toBe(200);
      expect(mocked.verifyDownloadedApk).toHaveBeenCalledWith(
        release,
        'file:///local/app.apk',
        expect.any(Function),
      );
    });

    it('下载完成先进入 verifying 并上报校验进度，通过后才是 ready', async () => {
      mocked.fetchLatestRelease.mockResolvedValue(release);
      mocked.downloadApk.mockResolvedValue('file:///local/app.apk');
      let statusWhileVerifying: string | undefined;
      let verifiedWhileVerifying: number | undefined;
      mocked.verifyDownloadedApk.mockImplementation(async (_release, _uri, onProgress) => {
        onProgress?.({ hashed: 120, total: 200 });
        statusWhileVerifying = useUpdateStore.getState().status;
        verifiedWhileVerifying = useUpdateStore.getState().verifiedBytes;
      });

      await useUpdateStore.getState().check();
      await useUpdateStore.getState().download();

      expect(statusWhileVerifying).toBe('verifying');
      expect(verifiedWhileVerifying).toBe(120);
      const state = useUpdateStore.getState();
      expect(state.status).toBe('ready');
      expect(state.verifiedBytes).toBe(200);
    });

    it('校验中重复触发检查与下载都不会叠加请求', async () => {
      useUpdateStore.setState({ status: 'verifying', release });

      await useUpdateStore.getState().check();
      await useUpdateStore.getState().download();

      expect(mocked.fetchLatestRelease).not.toHaveBeenCalled();
      expect(mocked.downloadApk).not.toHaveBeenCalled();
      expect(useUpdateStore.getState().status).toBe('verifying');
    });

    it('校验失败时进入 failed、清空本地路径并给出原因', async () => {
      mocked.fetchLatestRelease.mockResolvedValue(release);
      mocked.downloadApk.mockResolvedValue('file:///local/app.apk');
      mocked.verifyDownloadedApk.mockRejectedValue(new Error('安装包校验失败，文件可能已损坏或被篡改'));

      await useUpdateStore.getState().check();
      await useUpdateStore.getState().download();

      const state = useUpdateStore.getState();
      expect(state.status).toBe('failed');
      expect(state.localUri).toBeNull();
      expect(state.message).toBe('安装包校验失败，文件可能已损坏或被篡改');
    });

    it('没有可用版本时下载不做任何事', async () => {
      await useUpdateStore.getState().download();
      expect(mocked.downloadApk).not.toHaveBeenCalled();
    });
  });

  describe('install', () => {
    const prepareReady = async () => {
      mocked.fetchLatestRelease.mockResolvedValue(release);
      mocked.downloadApk.mockResolvedValue('file:///local/app.apk');
      await useUpdateStore.getState().check();
      await useUpdateStore.getState().download();
    };

    it('调用系统安装器', async () => {
      await prepareReady();

      await useUpdateStore.getState().install();

      expect(mocked.installApk).toHaveBeenCalledWith('file:///local/app.apk');
      expect(useUpdateStore.getState().message).toBeNull();
    });

    it('缺少「安装未知应用」权限时提示并可跳到授权页', async () => {
      await prepareReady();
      mocked.installApk.mockRejectedValue(new Error('Permission denied'));

      await useUpdateStore.getState().install();

      const state = useUpdateStore.getState();
      expect(state.status).toBe('ready');
      expect(state.message).toContain('安装未知应用');

      await useUpdateStore.getState().openInstallSettings();
      expect(mocked.openInstallPermissionSettings).toHaveBeenCalled();
    });

    it('尚未下载时不做任何事', async () => {
      await useUpdateStore.getState().install();
      expect(mocked.installApk).not.toHaveBeenCalled();
    });
  });
});
