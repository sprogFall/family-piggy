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
    const session = await authService.getSession().catch(() => null);
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
