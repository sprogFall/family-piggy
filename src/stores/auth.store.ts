import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { authService } from '@/services/auth.service';
import { profileService } from '@/services/profile.service';
import type { Profile } from '@/types/domain';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nickname: string) => Promise<void>;
  signOut: () => Promise<void>;
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
    const session = await authService.getSession().catch(() => null);
    await syncSession(session, set, get);
    authService.onAuthChange((next) => {
      void syncSession(next, set, get);
    });
  },

  signIn: async (email, password) => {
    await authService.signIn(email, password);
  },

  signUp: async (email, password, nickname) => {
    await authService.signUp(email, password, nickname);
  },

  signOut: async () => {
    await authService.signOut();
  },

  refreshProfile: async () => {
    const userId = get().session?.user.id;
    if (!userId) return;
    const profile = await profileService.getProfile(userId);
    set({ profile });
  },
}));
