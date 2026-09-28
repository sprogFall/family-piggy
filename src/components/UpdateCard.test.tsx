import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import * as updateService from '@/services/update.service';
import { useUpdateStore } from '@/stores/update.store';
import type { AppRelease } from '@/types/domain';

import { UpdateCard } from './UpdateCard';

jest.mock('@/services/update.service');

const mocked = updateService as jest.Mocked<typeof updateService>;

const release: AppRelease = {
  tagName: 'v0.1.7',
  version: '0.1.7',
  title: '家庭记账 v0.1.7',
  notes: 'v0.1.7：修复若干问题\n- 优化记账速度',
  pageUrl: 'https://github.com/sprogFall/family-piggy/releases/tag/v0.1.7',
  apkUrl: 'https://github.com/a.apk',
  apkSize: 70_000_000,
  sha256: 'a'.repeat(64),
  mirrors: [],
  publishedAt: null,
};

const resetStore = () =>
  useUpdateStore.setState({
    status: 'idle',
    release: null,
    currentVersion: '',
    receivedBytes: 0,
    totalBytes: null,
    localUri: null,
    message: null,
    ignoredVersion: null,
  });

describe('UpdateCard', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetStore();
    jest.clearAllMocks();
    mocked.fetchLatestRelease.mockReset();
    mocked.downloadApk.mockReset();
    mocked.verifyDownloadedApk.mockReset();
    mocked.installApk.mockReset();
    mocked.openInstallPermissionSettings.mockReset();
    mocked.getCurrentVersion.mockReturnValue('0.1.6');
  });

  it('进入页面自动检查并在发现新版本时展示版本与更新说明', async () => {
    mocked.fetchLatestRelease.mockResolvedValue(release);

    render(<UpdateCard />);

    expect(await screen.findByText('发现新版本 v0.1.7')).toBeTruthy();
    expect(screen.getByText('当前版本 v0.1.6')).toBeTruthy();
    expect(screen.getByText(/优化记账速度/)).toBeTruthy();
  });

  it('已是最新版本时给出提示', async () => {
    mocked.fetchLatestRelease.mockResolvedValue({ ...release, version: '0.1.6' });

    render(<UpdateCard />);

    expect(await screen.findByText('已是最新版本，无需更新')).toBeTruthy();
  });

  it('拿不到更新信息时展示可读原因与重试入口', async () => {
    mocked.fetchLatestRelease.mockResolvedValue(null);

    render(<UpdateCard />);

    expect(await screen.findByText(/暂时无法获取更新信息/)).toBeTruthy();
    expect(screen.getByText('重试')).toBeTruthy();
  });

  it('点击「立即更新」下载并展示进度，完成后可安装', async () => {
    mocked.fetchLatestRelease.mockResolvedValue(release);
    let finish: (uri: string) => void = () => undefined;
    mocked.downloadApk.mockImplementation((_release, onProgress) => {
      onProgress?.({ received: 35_000_000, total: 70_000_000 });
      return new Promise<string>((resolve) => {
        finish = resolve;
      });
    });

    render(<UpdateCard />);
    fireEvent.press(await screen.findByText('立即更新'));

    expect(await screen.findByText(/正在下载 50%/)).toBeTruthy();
    expect(screen.getByText(/33.4 MB \/ 66.8 MB/)).toBeTruthy();

    finish('file:///docs/updates/family-piggy-0.1.7.apk');
    expect(await screen.findByText(/安装包已下载完成/)).toBeTruthy();
    expect(mocked.verifyDownloadedApk).toHaveBeenCalledWith(
      release,
      'file:///docs/updates/family-piggy-0.1.7.apk',
    );

    fireEvent.press(screen.getByText('安装'));
    await waitFor(() =>
      expect(mocked.installApk).toHaveBeenCalledWith('file:///docs/updates/family-piggy-0.1.7.apk'),
    );
  });

  it('安装被系统拦截时提示并引导去授权', async () => {
    mocked.fetchLatestRelease.mockResolvedValue(release);
    mocked.downloadApk.mockResolvedValue('file:///docs/updates/app.apk');
    mocked.installApk.mockRejectedValue(new Error('Permission denied'));

    render(<UpdateCard />);
    fireEvent.press(await screen.findByText('立即更新'));
    fireEvent.press(await screen.findByText('安装'));

    expect(await screen.findByText(/请先允许本应用「安装未知应用」/)).toBeTruthy();
    fireEvent.press(screen.getByText('去允许「安装未知应用」'));
    await waitFor(() => expect(mocked.openInstallPermissionSettings).toHaveBeenCalled());
  });

  it('可以忽略某个版本，忽略后不再提示但仍可查看', async () => {
    mocked.fetchLatestRelease.mockResolvedValue(release);

    render(<UpdateCard />);
    fireEvent.press(await screen.findByText('忽略此版本'));

    expect(await screen.findByText('已忽略 v0.1.7 的更新提示')).toBeTruthy();
    expect(await AsyncStorage.getItem('update:ignoredVersion')).toBe('0.1.7');

    fireEvent.press(screen.getByText('仍要查看'));
    expect(await screen.findByText('发现新版本 v0.1.7')).toBeTruthy();
  });

  it('校验失败时提示原因并允许重试下载', async () => {
    mocked.fetchLatestRelease.mockResolvedValue(release);
    mocked.downloadApk.mockResolvedValue('file:///docs/updates/app.apk');
    mocked.verifyDownloadedApk.mockRejectedValue(new Error('安装包校验失败，文件可能已损坏或被篡改'));

    render(<UpdateCard />);
    fireEvent.press(await screen.findByText('立即更新'));

    expect(await screen.findByText('安装包校验失败，文件可能已损坏或被篡改')).toBeTruthy();
    expect(screen.getByText('重试下载')).toBeTruthy();
  });
});
