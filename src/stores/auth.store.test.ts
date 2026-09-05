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

  it('signIn 委托 authService', async () => {
    authMock.signIn.mockResolvedValue(undefined);
    await useAuthStore.getState().signIn('a@b.co', '123456');
    expect(authMock.signIn).toHaveBeenCalledWith('a@b.co', '123456');
  });

  it('signOut 委托 authService', async () => {
    authMock.signOut.mockResolvedValue(undefined);
    await useAuthStore.getState().signOut();
    expect(authMock.signOut).toHaveBeenCalled();
  });
});
