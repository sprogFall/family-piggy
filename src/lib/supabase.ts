import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import { authStorageKeyOf, createAuthRetryFetch } from '@/lib/auth';

/**
 * Supabase 连接信息通过 EXPO_PUBLIC_* 环境变量注入（babel-preset-expo 会将其内联进 bundle）：
 * - 本地：.env 文件（参考 .env.example，已 gitignore）
 * - CI 打包：GitHub Secrets 直接注入构建环境
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** 强制续期一次并返回新的 access_token；失败返回 null（兜底策略见 createAuthRetryFetch） */
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return error ? null : (data.session?.access_token ?? null);
  } catch {
    return null;
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  // 所有 Supabase 请求（含 auth 自身）都经过这层：access_token 过期时续期一次再重试
  global: {
    fetch: createAuthRetryFetch({
      fetchImpl: (input, init) => fetch(input, init),
      refresh: refreshAccessToken,
    }),
  },
});

/** auth-js 持久化会话的 storage key（推导算法见 lib/auth；解析失败返回 null） */
export const authStorageKey = (): string | null => authStorageKeyOf(SUPABASE_URL);

/**
 * 跟随 App 前后台切换启停 token 自动续期，返回取消订阅函数。
 *
 * supabase-js 在非浏览器环境默认「永远在前台」，启动即开启续期 ticker；而 RN 进入后台会
 * 冻结定时器，回前台后续期状态机容易错乱，长期未打开后更容易撞上「token 已过期」。
 * 这里按官方对 RN 的建议显式切换；若启动瞬间本身就在后台（被系统拉起），先把 ticker 停掉。
 */
export const watchAuthAutoRefresh = (): (() => void) => {
  const apply = (state: AppStateStatus): void => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
      return;
    }
    // unknown / extension 不做处理：拿不准时宁可让 ticker 多跑一会儿，也不要把它关掉
    if (state === 'background' || state === 'inactive') void supabase.auth.stopAutoRefresh();
  };
  apply(AppState.currentState);
  const subscription = AppState.addEventListener('change', apply);
  return () => subscription.remove();
};
