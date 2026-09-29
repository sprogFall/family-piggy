/**
 * 应用更新服务：查 GitHub Release → 下载 APK → 校验 → 拉起系统安装器。
 *
 * 仓库必须是**公开**的：私有仓库匿名调 `api.github.com/.../releases/latest` 只会拿到 404
 * （此时 `fetchLatestRelease` 返回 null，前端展示为「暂时无法检查更新」而不是报错）。
 * `/releases/latest` 天然排除草稿与预发布版本，因此手动触发的 `build-<run>` 体验包
 * 不会推给正式版用户。
 */

import { decode } from 'base64-arraybuffer';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

import { createSha256 } from '@/domain/sha256';
import type { AppRelease } from '@/types/domain';
import { toAppRelease, type GithubReleaseRow } from '@/types/github';

export const UPDATE_REPOSITORY = 'sprogFall/family-piggy';
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`;
/** 国内访问 GitHub 资产常被限速，默认附加一个代理镜像作为回退 */
export const GITHUB_PROXY_PREFIX = 'https://gh-proxy.com/';
/** 下载目录（App 私有目录，安装器通过 FileProvider 读取） */
export const UPDATE_DIRECTORY = `${FileSystem.documentDirectory ?? ''}updates/`;
/** 哈希校验的分块大小：4MB 减少 readAsStringAsync 调用与 base64 解码次数，明显快于 512KB */
const HASH_CHUNK_SIZE = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;

export interface DownloadProgress {
  /** 已下载字节数 */
  received: number;
  /** 总字节数；服务端未给 Content-Length 时为 null */
  total: number | null;
}

export interface VerifyProgress {
  /** 已校验字节数 */
  hashed: number;
  /** 文件总字节数 */
  total: number;
}

export const isAndroid = (): boolean => Platform.OS === 'android';

/** 当前安装版本（来自 app.config.js 的 version，发布时由 tag 注入） */
export const getCurrentVersion = (): string => Constants.expoConfig?.version ?? '';

const packageName = (): string => Constants.expoConfig?.android?.package ?? '';

/** GitHub 资产地址 → gh-proxy 镜像地址；非 release 下载地址返回 null */
export const buildProxyUrl = (url: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.host !== 'github.com') return null;
  if (!parsed.pathname.includes('/releases/download/')) return null;
  return `${GITHUB_PROXY_PREFIX}${parsed.toString()}`;
};

/** 下载地址优先级：Release 说明里声明的镜像 → gh-proxy → 直连（去重） */
export const resolveDownloadUrls = (release: AppRelease): string[] => {
  const candidates = [...release.mirrors];
  const proxy = buildProxyUrl(release.apkUrl);
  if (proxy !== null) candidates.push(proxy);
  candidates.push(release.apkUrl);

  const seen = new Set<string>();
  return candidates.filter((url) => (seen.has(url) ? false : (seen.add(url), true)));
};

export const apkFileName = (version: string): string => `family-piggy-${version || 'latest'}.apk`;

/** 逐个下载地址重试，全部失败时抛出最后一个错误 */
export const downloadWithFallback = async (
  release: AppRelease,
  download: (url: string, onProgress: (progress: DownloadProgress) => void) => Promise<string>,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> => {
  const urls = resolveDownloadUrls(release);
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      return await download(url, (progress) => onProgress?.(progress));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('安装包下载失败，请稍后重试');
};

/** 校验结论：null 表示通过，否则为给用户看的原因 */
export const describeIntegrityProblem = (params: {
  actualSize: number;
  expectedSize: number | null;
  actualSha256: string;
  expectedSha256: string | null;
}): string | null => {
  const { actualSize, expectedSize, actualSha256, expectedSha256 } = params;
  if (expectedSize !== null && actualSize !== expectedSize) {
    return '安装包大小与发布信息不一致，请重新下载';
  }
  if (expectedSha256 !== null && actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
    return '安装包校验失败，文件可能已损坏或被篡改';
  }
  return null;
};

const fetchLatestReleaseRow = async (): Promise<GithubReleaseRow | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(LATEST_RELEASE_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: controller.signal,
    });

    // 私有仓库 / 尚无 Release 都是 404：属「暂时拿不到更新信息」，不是错误
    if (response.status === 404) return null;
    if (response.status === 403) throw new Error('检查更新失败：GitHub 接口访问受限，请稍后再试');
    if (!response.ok) throw new Error(`检查更新失败（HTTP ${response.status}）`);

    const payload: unknown = await response.json();
    if (payload === null || typeof payload !== 'object') throw new Error('检查更新失败：响应格式异常');
    return payload as GithubReleaseRow;
  } finally {
    clearTimeout(timer);
  }
};

export const fetchLatestRelease = async (): Promise<AppRelease | null> => {
  const row = await fetchLatestReleaseRow();
  return row === null ? null : toAppRelease(row);
};

const ensureUpdateDirectory = async (): Promise<void> => {
  const info = await FileSystem.getInfoAsync(UPDATE_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(UPDATE_DIRECTORY, { intermediates: true });
  }
};

/** 清掉历史安装包，避免每次更新都堆几十 MB 在私有目录里 */
export const clearDownloadedApks = async (): Promise<void> => {
  try {
    const names = await FileSystem.readDirectoryAsync(UPDATE_DIRECTORY);
    await Promise.all(
      names
        .filter((name) => name.toLowerCase().endsWith('.apk'))
        .map((name) => FileSystem.deleteAsync(`${UPDATE_DIRECTORY}${name}`, { idempotent: true })),
    );
  } catch {
    // 目录还不存在或读取失败都不影响下载
  }
};

/** 下载安装包到私有目录；返回本地文件 URI */
export const downloadApk = async (
  release: AppRelease,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> => {
  await ensureUpdateDirectory();
  await clearDownloadedApks();

  const fileUri = `${UPDATE_DIRECTORY}${apkFileName(release.version)}`;

  return downloadWithFallback(
    release,
    async (url, report) => {
      const resumable = FileSystem.createDownloadResumable(url, fileUri, {}, (snapshot) => {
        report({
          received: snapshot.totalBytesWritten,
          total: snapshot.totalBytesExpectedToWrite > 0 ? snapshot.totalBytesExpectedToWrite : null,
        });
      });

      const result = await resumable.downloadAsync();
      if (result === undefined || result === null) throw new Error('安装包下载中断，请重试');
      if (typeof result.status === 'number' && (result.status < 200 || result.status >= 300)) {
        throw new Error(`安装包下载失败（HTTP ${result.status}）`);
      }
      return result.uri;
    },
    onProgress,
  );
};

/**
 * 分块读取文件并流式计算 SHA-256（几十 MB 的 APK 不进一次性内存）。
 *
 * 可选上报进度：纯 JS 哈希几十 MB 需要数秒（手机上更久），不上报的话界面只能停在
 * 「下载 100%」干等。只在**整数百分比变化**时上报，避免几十 MB 触发上百次重渲染。
 */
export const sha256OfFile = async (
  uri: string,
  onProgress?: (progress: VerifyProgress) => void,
): Promise<string> => {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  const total = info.exists && typeof info.size === 'number' ? info.size : 0;
  const hasher = createSha256();
  let reportedPercent = -1;

  for (let position = 0; position < total; position += HASH_CHUNK_SIZE) {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position,
      length: Math.min(HASH_CHUNK_SIZE, total - position),
    });
    hasher.update(new Uint8Array(decode(base64)));

    const hashed = Math.min(total, position + HASH_CHUNK_SIZE);
    const percent = Math.floor((hashed / total) * 100);
    if (percent !== reportedPercent) {
      reportedPercent = percent;
      onProgress?.({ hashed, total });
    }
  }

  return hasher.digest();
};

/** 下载完成后校验大小与 SHA-256；不一致时抛出原因。`onProgress` 用于展示校验进度 */
export const verifyDownloadedApk = async (
  release: AppRelease,
  uri: string,
  onProgress?: (progress: VerifyProgress) => void,
): Promise<void> => {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  if (!info.exists) throw new Error('安装包不存在，请重新下载');

  const actualSize = typeof info.size === 'number' ? info.size : 0;
  if (release.apkSize !== null && actualSize !== release.apkSize) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    throw new Error('安装包大小与发布信息不一致，请重新下载');
  }
  // Release 说明里没有 SHA256 时只做大小校验，避免用户为一次无意义哈希等待
  if (release.sha256 === null) return;

  const actualSha256 = await sha256OfFile(uri, onProgress);
  const problem = describeIntegrityProblem({
    actualSize,
    expectedSize: release.apkSize,
    actualSha256,
    expectedSha256: release.sha256,
  });

  if (problem !== null) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    throw new Error(problem);
  }
};

/** 拉起系统安装器安装本地 APK */
export const installApk = async (uri: string): Promise<void> => {
  if (!isAndroid()) throw new Error('当前仅支持 Android 应用内更新');

  const contentUri = await FileSystem.getContentUriAsync(uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    // FLAG_GRANT_READ_URI_PERMISSION：让安装器有权读取 FileProvider 暴露的安装包
    flags: 1,
  });
};

/** 打开「安装未知应用」授权页（首次安装第三方 APK 必需） */
export const openInstallPermissionSettings = async (): Promise<void> => {
  if (!isAndroid()) return;
  await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
    data: `package:${packageName()}`,
  });
};
