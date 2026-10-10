import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import { authStorageKey, supabase } from '@/lib/supabase';

const mapAuthError = (message: string): string => {
  if (/invalid login credentials/i.test(message)) return '邮箱或密码错误';
  if (/already registered|already exists/i.test(message)) return '该邮箱已被注册';
  if (/rate limit|too many/i.test(message)) return '操作过于频繁，请稍后再试';
  if (/email not confirmed/i.test(message)) return '请先前往邮箱完成验证';
  return message;
};

/** signUp 结果：项目开启邮箱确认时不会返回会话，需验证邮箱后才能登录 */
export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

export const authService = {
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /**
   * 直接从本地存储读取上次的会话，不触碰网络（用途见 auth.store.initialize）。
   *
   * auth-js 在 createClient 时就已开始恢复会话：access_token 过期时它会先发一趟续期请求，
   * 而 `getSession()` 会一直等到那趟请求结束。启动时用本地会话先进入已登录态，
   * 才不会把开屏卡在海外网络往返上。key 与内容格式均与 supabase-js 的持久化一致；
   * 读不到或格式不符时返回 null，调用方回落到等待 getSession()。
   */
  async readStoredSession(): Promise<Session | null> {
    const key = authStorageKey();
    if (!key) return null;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const session = JSON.parse(raw) as Session | null;
      return session?.access_token && session.user ? session : null;
    } catch {
      return null;
    }
  },

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(mapAuthError(error.message));
  },

  async signUp(email: string, password: string, nickname: string): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } },
    });
    if (error) throw new Error(mapAuthError(error.message));
    return { needsEmailConfirmation: !data.session };
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(mapAuthError(error.message));
  },

  /** 监听登录态变化，返回取消订阅函数 */
  onAuthChange(onChange: (session: Session | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      onChange(session);
    });
    return () => data.subscription.unsubscribe();
  },
};
