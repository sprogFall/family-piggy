import { supabase } from '@/lib/supabase';
import { createQueryChain, queryError } from '@/test/supabase-mock';

import { profileService } from './profile.service';

const fromMock = supabase.from as unknown as jest.Mock;

const profileRow = { id: 'u1', nickname: '小明', avatar_url: null };

describe('profileService', () => {
  afterEach(() => fromMock.mockReset());

  it('getProfile 返回领域对象', async () => {
    fromMock.mockReturnValue(createQueryChain({ data: profileRow, error: null }));
    const profile = await profileService.getProfile('u1');
    expect(profile).toEqual({ id: 'u1', nickname: '小明', avatarUrl: null });
  });

  it('getProfile 无数据抛错', async () => {
    fromMock.mockReturnValue(createQueryChain({ data: null, error: null }));
    await expect(profileService.getProfile('u1')).rejects.toThrow('加载用户信息失败');
  });

  it('getProfile 接口错误抛错', async () => {
    fromMock.mockReturnValue(createQueryChain(queryError('boom')));
    await expect(profileService.getProfile('u1')).rejects.toThrow('加载用户信息失败');
  });

  it('updateNickname 更新昵称字段', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await profileService.updateNickname('u1', '小红');
    expect(chain.update).toHaveBeenCalledWith({ nickname: '小红' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('updateAvatarUrl 更新头像字段', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await profileService.updateAvatarUrl('u1', 'https://cdn/avatar.jpg');
    expect(chain.update).toHaveBeenCalledWith({ avatar_url: 'https://cdn/avatar.jpg' });
  });
});
