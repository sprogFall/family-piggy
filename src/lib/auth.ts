/**
 * 认证相关的底层工具（与 Supabase 客户端、React Native 均无耦合，便于单测）。
 */

/**
 * 由项目 URL 推导 auth-js 持久化会话的 storage key：`sb-<项目 ref>-auth-token`。
 *
 * 与 supabase-js 未显式传 `storageKey` 时的默认算法保持一致（取主机名首段）。
 * 注意：**更换 `EXPO_PUBLIC_SUPABASE_URL`（例如第四档要接自定义域名）会让 key 变化**，
 * 届时需要同步显式指定 `auth.storageKey` 或接受一次重新登录。
 *
 * URL 不可解析时返回 null，调用方回落到「等待 getSession()」的老路径。
 */
export const authStorageKeyOf = (supabaseUrl: string): string | null => {
  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch {
    return null;
  }
};

/** 续期请求自身不能再触发续期，否则会自我等待（见 createAuthRetryFetch） */
const isTokenRefreshRequest = (url: string): boolean => url.includes('/auth/v1/token');

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

export interface AuthRetryFetchOptions {
  /** 真实网络实现 */
  fetchImpl: typeof fetch;
  /** 强制续期一次并返回新的 access_token；失败（含抛错）返回 null 即可 */
  refresh: () => Promise<string | null>;
}

/**
 * 给所有 Supabase 请求加一层「401 续期后重试一次」的 fetch。
 *
 * 背景：access_token 过期且后台续期失败时（弱网、或 auth-js 的刷新失败冷却期内），
 * 后续所有请求都会被拒绝。没有这层兜底就会出现「一次网络抖动 → 之后查询全部失败」，
 * 对海外网络尤其明显。只重试 401：RLS 拒绝是 403，重试没有意义。
 *
 * 并发 401 共用同一趟续期请求（单飞），避免重复调用 refreshSession 互相作废 refresh_token。
 */
export const createAuthRetryFetch = ({
  fetchImpl,
  refresh,
}: AuthRetryFetchOptions): typeof fetch => {
  let refreshInFlight: Promise<string | null> | null = null;

  const refreshOnce = (): Promise<string | null> => {
    refreshInFlight ??= Promise.resolve()
      .then(refresh)
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
    return refreshInFlight;
  };

  return async (input, init) => {
    const response = await fetchImpl(input, init);
    if (response.status !== 401 || isTokenRefreshRequest(urlOf(input))) return response;

    const token = await refreshOnce();
    if (!token) return response;

    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetchImpl(input, { ...init, headers });
  };
};
