jest.mock('@/services/auth.service', () => ({
  authService: {
    getSession: jest.fn(),
    readStoredSession: jest.fn(),
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

/** 只推进微任务队列（不使用真实计时器） */
const flushMicrotasks = async (): Promise<void> => {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
};

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'loading', session: null, profile: null });
    authMock.readStoredSession.mockResolvedValue(null);
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
    authMock.readStoredSession.mockImplementation(() => {
      order.push('readStoredSession');
      return Promise.resolve(null);
    });
    authMock.getSession.mockImplementation(() => {
      order.push('getSession');
      return Promise.resolve(null);
    });
    authMock.onAuthChange.mockImplementation((cb) => {
      order.push('subscribe');
      return jest.fn();
    });

    await useAuthStore.getState().initialize();

    expect(order).toEqual(['subscribe', 'readStoredSession', 'getSession']);
  });

  describe('会话续期不阻塞首屏', () => {
    it('本地已有会话时立即进入 signedIn，不等网络续期返回', async () => {
      authMock.readStoredSession.mockResolvedValue(sessionOf('u1'));
      let resolveSession: (session: Session | null) => void = () => undefined;
      authMock.getSession.mockImplementation(
        () =>
          new Promise<Session | null>((resolve) => {
            resolveSession = resolve;
          }),
      );

      const pending = useAuthStore.getState().initialize();
      await flushMicrotasks();

      // 续期请求尚未返回，界面已经可以进入主界面并渲染本地快照
      expect(useAuthStore.getState().status).toBe('signedIn');
      expect(useAuthStore.getState().session).toEqual(sessionOf('u1'));

      resolveSession(sessionOf('u1'));
      await pending;
      expect(useAuthStore.getState().status).toBe('signedIn');
      expect(profileMock.getProfile).toHaveBeenCalledWith('u1');
    });

    it('后台续期拿到刷新后的会话时以其为准', async () => {
      authMock.readStoredSession.mockResolvedValue({
        user: { id: 'u1' },
        access_token: 'expired',
      } as never);
      authMock.getSession.mockResolvedValue({
        user: { id: 'u1' },
        access_token: 'fresh',
      } as never);

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().session).toEqual({
        user: { id: 'u1' },
        access_token: 'fresh',
      });
    });

    it('续期确定失败（refresh_token 失效）时登出', async () => {
      authMock.readStoredSession.mockResolvedValue(sessionOf('u1'));
      authMock.getSession.mockResolvedValue(null);

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().status).toBe('signedOut');
      expect(useAuthStore.getState().session).toBeNull();
    });

    it('读会话异常时保留本地会话（交给请求层 401 重试兜底）', async () => {
      authMock.readStoredSession.mockResolvedValue(sessionOf('u1'));
      authMock.getSession.mockRejectedValue(new Error('boom'));

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().status).toBe('signedIn');
      expect(useAuthStore.getState().session).toEqual(sessionOf('u1'));
    });

    it('无本地会话且读会话异常时按未登录处理，不停在开屏', async () => {
      authMock.readStoredSession.mockResolvedValue(null);
      authMock.getSession.mockRejectedValue(new Error('boom'));

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().status).toBe('signedOut');
    });
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

  it('updateNickname 更新服务并同步本地 profile', async () => {
    useAuthStore.setState({
      status: 'signedIn',
      session: sessionOf('u1'),
      profile: { id: 'u1', nickname: '小明', avatarUrl: null },
    });
    profileMock.updateNickname.mockResolvedValue(undefined);

    await useAuthStore.getState().updateNickname('小红');

    expect(profileMock.updateNickname).toHaveBeenCalledWith('u1', '小红');
    expect(useAuthStore.getState().profile?.nickname).toBe('小红');
  });

  it('updateNickname 未登录时抛错', async () => {
    await expect(useAuthStore.getState().updateNickname('小红')).rejects.toThrow('未登录');
  });

  it('signOut 委托 authService', async () => {
    authMock.signOut.mockResolvedValue(undefined);
    await useAuthStore.getState().signOut();
    expect(authMock.signOut).toHaveBeenCalled();
  });
});
