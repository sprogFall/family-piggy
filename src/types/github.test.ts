import type { GithubReleaseRow } from './github';
import { toAppRelease } from './github';

const SHA256 = 'a'.repeat(64);

const row: GithubReleaseRow = {
  tag_name: 'v0.1.7',
  name: '家庭记账 v0.1.7',
  body: ['v0.1.7：修复若干问题', '', '- 优化记账速度', `SHA256: ${SHA256}`, 'APK-Mirror: https://gh-proxy.com/https://github.com/x.apk'].join('\n'),
  html_url: 'https://github.com/sprogFall/family-piggy/releases/tag/v0.1.7',
  published_at: '2026-09-28T10:00:00Z',
  assets: [
    { name: 'family-piggy-v0.1.7.apk.sha256', browser_download_url: 'https://example.com/a.sha256', size: 90 },
    { name: 'family-piggy-v0.1.7.apk', browser_download_url: 'https://github.com/x.apk', size: 70_000_000 },
  ],
};

describe('toAppRelease', () => {
  it('映射版本、说明、校验和、镜像与安装包信息', () => {
    expect(toAppRelease(row)).toEqual({
      tagName: 'v0.1.7',
      version: '0.1.7',
      title: '家庭记账 v0.1.7',
      notes: row.body,
      pageUrl: row.html_url,
      apkUrl: 'https://github.com/x.apk',
      apkSize: 70_000_000,
      sha256: SHA256,
      mirrors: ['https://gh-proxy.com/https://github.com/x.apk'],
      publishedAt: '2026-09-28T10:00:00Z',
    });
  });

  it('跳过 .sha256 附件，只认 .apk', () => {
    expect(toAppRelease(row)?.apkUrl).toBe('https://github.com/x.apk');
  });

  it('标题缺失时回落为 tag', () => {
    expect(toAppRelease({ ...row, name: '  ' })?.title).toBe('v0.1.7');
  });

  it('草稿、无安装包、非版本 tag 一律返回 null', () => {
    expect(toAppRelease({ ...row, draft: true })).toBeNull();
    expect(toAppRelease({ ...row, assets: [] })).toBeNull();
    expect(toAppRelease({ ...row, assets: [{ name: 'x.apk', browser_download_url: '' }] })).toBeNull();
    expect(toAppRelease({ ...row, tag_name: 'build-42' })).toBeNull();
    expect(toAppRelease({ ...row, tag_name: undefined })).toBeNull();
    expect(toAppRelease({ ...row, html_url: undefined })).toBeNull();
  });

  it('说明里没有校验和时为 null（仍允许下载，只是不做哈希校验）', () => {
    const release = toAppRelease({ ...row, body: '普通说明' });
    expect(release?.sha256).toBeNull();
    expect(release?.mirrors).toEqual([]);
  });
});
