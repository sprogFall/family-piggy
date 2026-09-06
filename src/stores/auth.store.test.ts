jest.mock('@/services/auth.service', () => ({
  authService: {
    getSession: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthChange: jest.fn(() => jest.fn()),
  },
}));

jest.mock('@/services/profile.service', () => ({
  profileService: { getProfile: jest.fn(), updateNickname: jest.fn() },
}));

import type { Session } from '@supabase/supabase-js';

import { authService } from '@/services/auth.service';
import { profileService } from '@/services/profile.service';

import { useAuthStore } from './auth.store';

const authMock = authService as jest.Mocked<typeof authService>;
const profileMock = profileService as jest.Mocked<typeof profileService>;

const sessionOf = (userId: string) => ({ user: { id: userId } }) as never;

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'loading', session: null, profile: null });
  });

  it('initialize：有会话则进入 signedIn 并拉取资料', async () => {
    authMock.getSession.mockResolvedValue(sessionOf('u1'));
    profileMock.getProfile.mockResolvedValue({ id: 'u1', nickname: '小明', avatarUrl: null });

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(useAuthStore.getState().profile).toEqual({ id: 'u1', nickname: '小明', avatarUrl: null });
    expect(authMock.onAuthChange).toHaveBeenCalled();
  });

  it('initialize：无会话进入 signedOut', async () => {
    authMock.getSession.mockResolvedValue(null);
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('initialize：资料接口失败不影响登录态', async () => {
    authMock.getSession.mockResolvedValue(sessionOf('u1'));
    profileMock.getProfile.mockRejectedValue(new Error('offline'));
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(useAuthStore.getState().profile).toBeNull();
  });

  it('initialize 先注册会话监听再读取会话（防 SIGNED_OUT 丢失）', async () => {
    const order: string[] = [];
    authMock.getSession.mockImplementation(() => {
      order.push('getSession');
      return Promise.resolve(null);
    });
    authMock.onAuthChange.mockImplementation((cb) => {
      order.push('subscribe');
      return jest.fn();
    });

    await useAuthStore.getState().initialize();

    expect(order).toEqual(['subscribe', 'getSession']);
  });

  it('getSession 之后到达的 SIGNED_OUT 事件同步为未登录', async () => {
    let notify: ((session: Session | null) => void) | undefined;
    authMock.onAuthChange.mockImplementation((cb) => {
      notify = cb;
      return jest.fn();
    });
    authMock.getSession.mockResolvedValue(sessionOf('u1'));

    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe('signedIn');

    notify?.(null);
    await Promise.resolve();
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('signUp 委托 authService 并透传结果', async () => {
    const result = { needsEmailConfirmation: false };
    authMock.signUp.mockResolvedValue(result);
    await expect(useAuthStore.getState().signUp('a@b.co', '123456', '小明')).resolves.toBe(result);
    expect(authMock.signUp).toHaveBeenCalledWith('a@b.co', '123456', '小明');
  });

  it('signOut 委托 authService', async () => {
    authMock.signOut.mockResolvedValue(undefined);
    await useAuthStore.getState().signOut();
    expect(authMock.signOut).toHaveBeenCalled();
  });
});
