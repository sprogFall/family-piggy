import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

const mapAuthError = (message: string): string => {
  if (/invalid login credentials/i.test(message)) return '邮箱或密码错误';
  if (/already registered|already exists/i.test(message)) return '该邮箱已被注册';
  if (/rate limit|too many/i.test(message)) return '操作过于频繁，请稍后再试';
  if (/email not confirmed/i.test(message)) return '请先前往邮箱完成验证';
  return message;
};

export const authService = {
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(mapAuthError(error.message));
  },

  async signUp(email: string, password: string, nickname: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } },
    });
    if (error) throw new Error(mapAuthError(error.message));
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
