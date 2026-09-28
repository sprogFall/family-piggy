import type { AppRelease } from '@/types/domain';

import {
  apkFileName,
  buildProxyUrl,
  describeIntegrityProblem,
  downloadWithFallback,
  fetchLatestRelease,
  resolveDownloadUrls,
} from './update.service';

const release: AppRelease = {
  tagName: 'v0.1.7',
  version: '0.1.7',
  title: '家庭记账 v0.1.7',
  notes: '说明',
  pageUrl: 'https://github.com/sprogFall/family-piggy/releases/tag/v0.1.7',
  apkUrl: 'https://github.com/sprogFall/family-piggy/releases/download/v0.1.7/family-piggy-v0.1.7.apk',
  apkSize: 123,
  sha256: 'a'.repeat(64),
  mirrors: [],
  publishedAt: null,
};

describe('buildProxyUrl', () => {
  it('只代理 GitHub 的 release 下载地址', () => {
    expect(buildProxyUrl(release.apkUrl)).toBe(`https://gh-proxy.com/${release.apkUrl}`);
    expect(buildProxyUrl('https://github.com/sprogFall/family-piggy')).toBeNull();
    expect(buildProxyUrl('https://example.com/releases/download/v1/a.apk')).toBeNull();
    expect(buildProxyUrl('http://github.com/x/releases/download/v1/a.apk')).toBeNull();
    expect(buildProxyUrl('不是地址')).toBeNull();
  });
});

describe('resolveDownloadUrls', () => {
  it('顺序为 声明镜像 → gh-proxy → 直连', () => {
    const urls = resolveDownloadUrls({ ...release, mirrors: ['https://mirror.example.com/a.apk'] });
    expect(urls).toEqual([
      'https://mirror.example.com/a.apk',
      `https://gh-proxy.com/${release.apkUrl}`,
      release.apkUrl,
    ]);
  });

  it('去重且保持首次出现的顺序', () => {
    const urls = resolveDownloadUrls({
      ...release,
      mirrors: [`https://gh-proxy.com/${release.apkUrl}`, release.apkUrl],
    });
    expect(urls).toEqual([`https://gh-proxy.com/${release.apkUrl}`, release.apkUrl]);
  });
});

describe('apkFileName', () => {
  it('带版本号，避免与旧安装包混淆', () => {
    expect(apkFileName('0.1.7')).toBe('family-piggy-0.1.7.apk');
    expect(apkFileName('')).toBe('family-piggy-latest.apk');
  });
});

describe('downloadWithFallback', () => {
  it('第一个地址失败时顺延到下一个，并透传进度', async () => {
    const tried: string[] = [];
    const progress: number[] = [];

    const uri = await downloadWithFallback(
      release,
      async (url, report) => {
        tried.push(url);
        report({ received: 10, total: 100 });
        if (tried.length === 1) throw new Error('首个镜像不可用');
        return '/local/app.apk';
      },
      (state) => progress.push(state.received),
    );

    expect(uri).toBe('/local/app.apk');
    expect(tried).toEqual([`https://gh-proxy.com/${release.apkUrl}`, release.apkUrl]);
    expect(progress).toEqual([10, 10]);
  });

  it('全部失败时抛出最后一个错误', async () => {
    await expect(
      downloadWithFallback(release, async (url) => {
        throw new Error(`失败于 ${url}`);
      }),
    ).rejects.toThrow(`失败于 ${release.apkUrl}`);
  });
});

describe('describeIntegrityProblem', () => {
  const base = { actualSize: 123, expectedSize: 123, actualSha256: 'A'.repeat(64), expectedSha256: 'a'.repeat(64) };

  it('大小与哈希都一致时通过（哈希大小写不敏感）', () => {
    expect(describeIntegrityProblem(base)).toBeNull();
  });

  it('大小不一致时给出提示', () => {
    expect(describeIntegrityProblem({ ...base, actualSize: 120 })).toBe(
      '安装包大小与发布信息不一致，请重新下载',
    );
  });

  it('哈希不一致时给出提示', () => {
    expect(describeIntegrityProblem({ ...base, actualSha256: 'b'.repeat(64) })).toBe(
      '安装包校验失败，文件可能已损坏或被篡改',
    );
  });

  it('发布方未提供大小/哈希时不做校验', () => {
    expect(
      describeIntegrityProblem({ ...base, expectedSize: null, expectedSha256: null, actualSha256: 'c'.repeat(64) }),
    ).toBeNull();
  });
});

describe('fetchLatestRelease', () => {
  const row = {
    tag_name: 'v0.1.7',
    name: '家庭记账 v0.1.7',
    body: '说明',
    html_url: 'https://github.com/sprogFall/family-piggy/releases/tag/v0.1.7',
    published_at: '2026-09-28T10:00:00Z',
    assets: [{ name: 'family-piggy-v0.1.7.apk', browser_download_url: 'https://github.com/a.apk', size: 9 }],
  };

  const mockFetch = (impl: jest.Mock) => {
    global.fetch = impl as unknown as typeof fetch;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('解析最新正式版本', async () => {
    mockFetch(jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => row }));

    await expect(fetchLatestRelease()).resolves.toMatchObject({
      tagName: 'v0.1.7',
      version: '0.1.7',
      apkUrl: 'https://github.com/a.apk',
    });
  });

  it('404（私有仓库 / 尚无发布）视为暂时拿不到，返回 null', async () => {
    mockFetch(jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    await expect(fetchLatestRelease()).resolves.toBeNull();
  });

  it('限流与其它错误抛出可读文案', async () => {
    mockFetch(jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }));
    await expect(fetchLatestRelease()).rejects.toThrow('检查更新失败：GitHub 接口访问受限，请稍后再试');

    mockFetch(jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    await expect(fetchLatestRelease()).rejects.toThrow('检查更新失败（HTTP 500）');
  });

  it('标签不是版本号（体验包）时不做提示', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ...row, tag_name: 'build-42' }) }),
    );
    await expect(fetchLatestRelease()).resolves.toBeNull();
  });
});
