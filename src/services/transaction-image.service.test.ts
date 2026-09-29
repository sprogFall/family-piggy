import * as FileSystem from 'expo-file-system';

import { supabase } from '@/lib/supabase';

import { transactionImagePathOf, transactionImageService } from './transaction-image.service';

const fromMock = supabase.storage.from as unknown as jest.Mock;
const readAsStringAsyncMock = FileSystem.readAsStringAsync as unknown as jest.Mock;

interface StorageMock {
  upload: jest.Mock;
  getPublicUrl: jest.Mock;
  remove: jest.Mock;
}

const makeStorage = (uploadError: unknown = null): StorageMock => ({
  upload: jest.fn(async () => ({ data: {}, error: uploadError })),
  getPublicUrl: jest.fn((path: string) => ({
    data: { publicUrl: `https://cdn.test/storage/v1/object/public/transaction-images/${path}` },
  })),
  remove: jest.fn(async () => ({ data: null, error: null })),
});

describe('transactionImagePathOf', () => {
  it('从公开 URL 反解对象路径并解码', () => {
    expect(
      transactionImagePathOf(
        'https://cdn.test/storage/v1/object/public/transaction-images/u1/l1/a%20b.jpg',
      ),
    ).toBe('u1/l1/a b.jpg');
  });

  it('非目标桶地址返回 null', () => {
    expect(transactionImagePathOf('https://cdn.test/other/a.jpg')).toBeNull();
  });
});

describe('transactionImageService', () => {
  beforeEach(() => {
    fromMock.mockReset();
    readAsStringAsyncMock.mockClear();
    readAsStringAsyncMock.mockResolvedValue('aGVsbG8=');
  });

  it('上传最多 3 张并返回公开 URL', async () => {
    const storage = makeStorage();
    fromMock.mockReturnValue(storage);
    const urls = await transactionImageService.upload('l1', 'u1', [
      { uri: 'file:///a.jpg', mimeType: 'image/jpeg' },
      { uri: 'file:///b.png', mimeType: 'image/png' },
    ]);

    expect(urls).toHaveLength(2);
    expect(storage.upload).toHaveBeenCalledTimes(2);
    expect(storage.upload).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/^u1\/l1\/\d+-0\.jpg$/),
      expect.any(Object),
      { contentType: 'image/jpeg', upsert: false },
    );
    expect(storage.upload).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/^u1\/l1\/\d+-1\.png$/),
      expect.any(Object),
      { contentType: 'image/png', upsert: false },
    );
    expect(urls[0]).toContain('/transaction-images/u1/l1/');
  });

  it('超过 3 张直接拒绝且不读文件', async () => {
    await expect(
      transactionImageService.upload('l1', 'u1', [
        { uri: '1' },
        { uri: '2' },
        { uri: '3' },
        { uri: '4' },
      ]),
    ).rejects.toThrow('每笔最多上传 3 张图片');
    expect(readAsStringAsyncMock).not.toHaveBeenCalled();
  });

  it('上传失败时抛出友好错误并清理已上传对象', async () => {
    const storage = makeStorage();
    storage.upload
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    fromMock.mockReturnValue(storage);
    await expect(
      transactionImageService.upload('l1', 'u1', [
        { uri: 'file:///a.jpg' },
        { uri: 'file:///b.jpg' },
      ]),
    ).rejects.toThrow('上传账单图片失败');
    expect(storage.upload).toHaveBeenCalledTimes(2);
    expect(storage.remove).toHaveBeenCalledWith([expect.stringMatching(/^u1\/l1\/\d+-0\.jpg$/)]);
  });

  it('remove 解析公开 URL 后按对象路径删除，忽略无法解析的 URL', async () => {
    const storage = makeStorage();
    fromMock.mockReturnValue(storage);
    await transactionImageService.remove([
      'https://cdn.test/storage/v1/object/public/transaction-images/u1/l1/a.jpg',
      'https://cdn.test/other/b.jpg',
    ]);
    expect(storage.remove).toHaveBeenCalledWith(['u1/l1/a.jpg']);
  });
});
