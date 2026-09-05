import { supabase } from '@/lib/supabase';

import { avatarService } from './avatar.service';

jest.mock('expo-file-system', () => ({
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  readAsStringAsync: jest.fn(async () => 'aGVsbG8='),
}));

jest.mock('@/services/profile.service', () => ({
  profileService: { updateAvatarUrl: jest.fn(async () => undefined) },
}));

import { profileService } from '@/services/profile.service';

const storageFromMock = supabase.storage.from as unknown as jest.Mock;
const updateAvatarUrlMock = profileService.updateAvatarUrl as jest.Mock;

const makeStorage = (uploadResult: { data: unknown; error: unknown }) => ({
  upload: jest.fn(async () => uploadResult),
  getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://cdn/avatar.jpg' } })),
});

describe('avatarService', () => {
  afterEach(() => {
    storageFromMock.mockReset();
    updateAvatarUrlMock.mockClear();
  });

  it('上传到本人目录并回写 profile，返回公开地址', async () => {
    const storage = makeStorage({ data: {}, error: null });
    storageFromMock.mockReturnValue(storage);

    const url = await avatarService.upload('u1', 'file:///photo.jpg');

    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^u1\/avatar-\d+\.jpg$/),
      expect.any(Object),
      { contentType: 'image/jpeg', upsert: true },
    );
    expect(updateAvatarUrlMock).toHaveBeenCalledWith('u1', 'https://cdn/avatar.jpg');
    expect(url).toBe('https://cdn/avatar.jpg');
  });

  it('透传自定义 mimeType', async () => {
    const storage = makeStorage({ data: {}, error: null });
    storageFromMock.mockReturnValue(storage);
    await avatarService.upload('u1', 'file:///photo.png', 'image/png');
    expect(storage.upload).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      { contentType: 'image/png', upsert: true },
    );
  });

  it('上传失败抛出友好错误且不回写 profile', async () => {
    const storage = makeStorage({ data: null, error: { message: 'storage error' } });
    storageFromMock.mockReturnValue(storage);

    await expect(avatarService.upload('u1', 'file:///photo.jpg')).rejects.toThrow('上传头像失败');
    expect(updateAvatarUrlMock).not.toHaveBeenCalled();
  });
});
