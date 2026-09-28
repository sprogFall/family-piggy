/**
 * GitHub Releases API 响应行类型与领域映射。
 *
 * 只声明「检查更新」用得到的字段（其余字段一律忽略，GitHub 加字段不会影响解析）。
 * 仓库需为公开：私有仓库匿名调用 `api.github.com/.../releases/latest` 会直接 404。
 */

import { normalizeVersionTag } from '@/domain/app-version';
import { extractApkMirrors, extractSha256 } from '@/domain/release-notes';
import type { AppRelease } from '@/types/domain';

export interface GithubReleaseAssetRow {
  name?: string;
  browser_download_url?: string;
  size?: number;
}

export interface GithubReleaseRow {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GithubReleaseAssetRow[];
}

const APK_SUFFIX = '.apk';

const findApkAsset = (assets: readonly GithubReleaseAssetRow[]): GithubReleaseAssetRow | null =>
  assets.find(
    (asset) =>
      typeof asset.name === 'string' &&
      asset.name.toLowerCase().endsWith(APK_SUFFIX) &&
      typeof asset.browser_download_url === 'string' &&
      asset.browser_download_url.length > 0,
  ) ?? null;

/**
 * 映射为领域模型；草稿、无安装包、或 tag 不是版本号（如预发布通道的 `build-42`）时返回 null。
 */
export const toAppRelease = (row: GithubReleaseRow): AppRelease | null => {
  if (row.draft === true) return null;

  const tagName = (row.tag_name ?? '').trim();
  const version = normalizeVersionTag(tagName);
  if (version === null) return null;

  const pageUrl = (row.html_url ?? '').trim();
  if (pageUrl.length === 0) return null;

  const asset = findApkAsset(row.assets ?? []);
  if (asset === null) return null;

  const notes = row.body ?? '';

  return {
    tagName,
    version,
    title: (row.name ?? '').trim() || tagName,
    notes,
    pageUrl,
    apkUrl: asset.browser_download_url as string,
    apkSize: typeof asset.size === 'number' ? asset.size : null,
    sha256: extractSha256(notes),
    mirrors: extractApkMirrors(notes),
    publishedAt: row.published_at ?? null,
  };
};
