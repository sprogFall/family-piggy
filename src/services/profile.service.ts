import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/domain';
import { toProfile, type ProfileRow } from '@/types/db';

export const profileService = {
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) throw new Error('加载用户信息失败');
    return toProfile(data as ProfileRow);
  },

  async updateNickname(userId: string, nickname: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ nickname })
      .eq('id', userId);
    if (error) throw new Error('修改昵称失败');
  },

  async updateAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);
    if (error) throw new Error('更新头像失败');
  },
};
