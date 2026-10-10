import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { authService, type SignUpResult } from '@/services/auth.service';
import { profileService } from '@/services/profile.service';
import type { Profile } from '@/types/domain';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nickname: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const syncSession = async (
  session: Session | null,
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState,
): Promise<void> => {
  if (session?.user) {
    set({ session, status: 'signedIn' });
    if (get().profile?.id !== session.user.id) {
      const profile = await profileService.getProfile(session.user.id).catch(() => null);
      set({ profile });
    }
  } else {
    set({ session: null, profile: null, status: 'signedOut' });
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  session: null,
  profile: null,

  initialize: async () => {
    // 必须先订阅会话变化再读取会话：token 过期后 auth-js 的恢复流程可能发出 SIGNED_OUT，
    // 若此时监听器尚未注册，事件会被丢失，导致界面停留在"已登录"而底层会话已清空，
    // 后续所有请求将以匿名身份发出并被 RLS 以 42501 拒绝
    authService.onAuthChange((next) => {
      void syncSession(next, set, get);
    });

    // 再用本地持久化的会话立即进入已登录态：access_token 过期时 auth-js 会先走一趟续期请求，
    // 而 getSession() 必须等它结束——开屏不能卡在这趟海外网络往返上。本地会话只负责先渲染，
    // 真正的校验/续期结果随后由 syncSession 覆盖（含续期失败被登出）。
    const storedSession = await authService.readStoredSession().catch(() => null);
    if (storedSession) set({ session: storedSession, status: 'signedIn' });

    const session = await authService.getSession().catch(() => undefined);
    if (session === undefined) {
      // 读会话异常：已有本地会话时保持现状（请求层会用 401 续期重试兜底），
      // 否则按未登录处理，避免界面一直停在开屏
      if (!storedSession) set({ session: null, profile: null, status: 'signedOut' });
      return;
    }
    await syncSession(session, set, get);
  },

  signIn: async (email, password) => {
    await authService.signIn(email, password);
  },

  signUp: (email, password, nickname) => authService.signUp(email, password, nickname),

  signOut: async () => {
    await authService.signOut();
  },

  updateNickname: async (nickname) => {
    const userId = get().session?.user.id;
    if (!userId) throw new Error('未登录');
    await profileService.updateNickname(userId, nickname);
    const profile = get().profile;
    if (profile) set({ profile: { ...profile, nickname } });
  },

  refreshProfile: async () => {
    const userId = get().session?.user.id;
    if (!userId) return;
    const profile = await profileService.getProfile(userId);
    set({ profile });
  },
}));
