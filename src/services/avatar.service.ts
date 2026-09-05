import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

import { supabase } from '@/lib/supabase';
import { profileService } from '@/services/profile.service';

const AVATAR_BUCKET = 'avatars';

export const avatarService = {
  /**
   * 上传头像到 Supabase Storage（avatars/<uid>/ 时间戳命名，避免 CDN 缓存），
   * 并回写 profile.avatar_url，返回公开访问地址。
   */
  async upload(userId: string, localUri: string, mimeType = 'image/jpeg'): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const path = `${userId}/avatar-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, decode(base64), { contentType: mimeType, upsert: true });
    if (error) throw new Error('上传头像失败');

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('获取头像地址失败');

    await profileService.updateAvatarUrl(userId, data.publicUrl);
    return data.publicUrl;
  },
};
