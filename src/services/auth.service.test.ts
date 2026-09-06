import { supabase } from '@/lib/supabase';

import { authService } from './auth.service';

const authMock = supabase.auth as unknown as Record<string, jest.Mock>;

describe('authService', () => {
  afterEach(() => jest.clearAllMocks());

  it('signIn 成功无异常', async () => {
    authMock.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    await expect(authService.signIn('a@b.co', '123456')).resolves.toBeUndefined();
  });

  it('signIn 凭据错误映射为友好文案', async () => {
    authMock.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    await expect(authService.signIn('a@b.co', 'wrong')).rejects.toThrow('邮箱或密码错误');
  });

  it('signUp 携带昵称元数据', async () => {
    authMock.signUp.mockResolvedValue({ data: {}, error: null });
    await authService.signUp('a@b.co', '123456', '小明');
    expect(authMock.signUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: '123456',
      options: { data: { nickname: '小明' } },
    });
  });

  it('signUp 返回会话时无需邮箱验证', async () => {
    authMock.signUp.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    await expect(authService.signUp('a@b.co', '123456', '小明')).resolves.toEqual({
      needsEmailConfirmation: false,
    });
  });

  it('signUp 未返回会话时标记需要邮箱验证', async () => {
    authMock.signUp.mockResolvedValue({ data: { session: null }, error: null });
    await expect(authService.signUp('a@b.co', '123456', '小明')).resolves.toEqual({
      needsEmailConfirmation: true,
    });
  });

  it('signUp 邮箱已注册映射文案', async () => {
    authMock.signUp.mockResolvedValue({
      data: {},
      error: { message: 'User already registered' },
    });
    await expect(authService.signUp('a@b.co', '123456', '小明')).rejects.toThrow('该邮箱已被注册');
  });

  it('getSession 返回会话', async () => {
    const session = { user: { id: 'u1' } };
    authMock.getSession.mockResolvedValue({ data: { session }, error: null });
    await expect(authService.getSession()).resolves.toBe(session);
  });

  it('onAuthChange 注册监听并返回取消函数', () => {
    const unsubscribe = jest.fn();
    authMock.onAuthStateChange.mockImplementation((cb: (e: string, s: unknown) => void) => {
      cb('SIGNED_IN', { user: { id: 'u1' } });
      return { data: { subscription: { unsubscribe } } };
    });
    const seen: unknown[] = [];
    const off = authService.onAuthChange((s) => seen.push(s));
    expect(seen).toEqual([{ user: { id: 'u1' } }]);
    off();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
