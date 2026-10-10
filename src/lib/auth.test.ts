import { authStorageKeyOf, createAuthRetryFetch } from './auth';

const ok = { status: 200 } as Response;
const unauthorized = { status: 401 } as Response;

const asFetch = (impl: jest.Mock): typeof fetch => impl as unknown as typeof fetch;

const headersOf = (init?: RequestInit): Headers => new Headers(init?.headers);

/** 只推进微任务队列（不使用真实计时器） */
const flushMicrotasks = async (): Promise<void> => {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
};

describe('authStorageKeyOf', () => {
  it('按 supabase-js 的默认算法推导会话持久化 key', () => {
    expect(authStorageKeyOf('https://abcdefgh.supabase.co')).toBe('sb-abcdefgh-auth-token');
  });

  it('本地开发地址同样取主机名首段', () => {
    expect(authStorageKeyOf('http://localhost:54321')).toBe('sb-localhost-auth-token');
  });

  it('URL 不可解析时返回 null（调用方回落到等待 getSession）', () => {
    expect(authStorageKeyOf('')).toBeNull();
    expect(authStorageKeyOf('不是地址')).toBeNull();
  });
});

describe('createAuthRetryFetch', () => {
  const url = 'https://abcdefgh.supabase.co/rest/v1/ledgers';
  const refreshUrl = 'https://abcdefgh.supabase.co/auth/v1/token?grant_type=refresh_token';

  it('非 401 响应直接透传，不触发续期', async () => {
    const fetchImpl = jest.fn(async () => ok);
    const refresh = jest.fn(async () => 'new-token');
    const fetchWithRetry = createAuthRetryFetch({ fetchImpl: asFetch(fetchImpl), refresh });

    await expect(fetchWithRetry(url)).resolves.toBe(ok);

    expect(refresh).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('401 时续期一次并用新 token 重试，其余请求头保持不动', async () => {
    const fetchImpl = jest.fn();
    fetchImpl.mockResolvedValueOnce(unauthorized).mockResolvedValueOnce(ok);
    const refresh = jest.fn(async () => 'new-token');
    const fetchWithRetry = createAuthRetryFetch({ fetchImpl: asFetch(fetchImpl), refresh });

    const response = await fetchWithRetry(url, {
      headers: { apikey: 'anon-key', Authorization: 'Bearer expired' },
    });

    expect(response).toBe(ok);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const retryHeaders = headersOf(fetchImpl.mock.calls[1][1] as RequestInit);
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-token');
    expect(retryHeaders.get('apikey')).toBe('anon-key');
  });

  it('续期请求自身返回 401 时不再续期（否则会自我等待）', async () => {
    const fetchImpl = jest.fn(async () => unauthorized);
    const refresh = jest.fn(async () => 'new-token');
    const fetchWithRetry = createAuthRetryFetch({ fetchImpl: asFetch(fetchImpl), refresh });

    await expect(fetchWithRetry(refreshUrl)).resolves.toBe(unauthorized);

    expect(refresh).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('续期拿不到新 token 时返回原始 401 响应，不重试', async () => {
    const fetchImpl = jest.fn(async () => unauthorized);
    const refresh = jest.fn(async () => null);
    const fetchWithRetry = createAuthRetryFetch({ fetchImpl: asFetch(fetchImpl), refresh });

    await expect(fetchWithRetry(url)).resolves.toBe(unauthorized);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('续期抛错同样按「拿不到新 token」处理', async () => {
    const fetchImpl = jest.fn(async () => unauthorized);
    const refresh = jest.fn(async () => {
      throw new Error('offline');
    });
    const fetchWithRetry = createAuthRetryFetch({ fetchImpl: asFetch(fetchImpl), refresh });

    await expect(fetchWithRetry(url)).resolves.toBe(unauthorized);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('并发 401 共用同一趟续期请求（单飞）', async () => {
    const fetchImpl = jest.fn(async () => unauthorized);
    let resolveRefresh: (token: string | null) => void = () => undefined;
    const refresh = jest.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const fetchWithRetry = createAuthRetryFetch({ fetchImpl: asFetch(fetchImpl), refresh });

    const pending = [fetchWithRetry(url), fetchWithRetry(url), fetchWithRetry(url)];
    await flushMicrotasks();
    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRefresh('new-token');
    await Promise.all(pending);

    // 三次首轮 + 三次重试
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it('续期完成后新的 401 会重新发起续期', async () => {
    const fetchImpl = jest.fn(async () => unauthorized);
    const refresh = jest.fn(async () => 'new-token');
    const fetchWithRetry = createAuthRetryFetch({ fetchImpl: asFetch(fetchImpl), refresh });

    await fetchWithRetry(url);
    await fetchWithRetry(url);

    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
