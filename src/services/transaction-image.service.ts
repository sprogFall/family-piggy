import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

import { MAX_TRANSACTION_IMAGES } from '@/domain/transaction-images';
import { supabase } from '@/lib/supabase';

export const TRANSACTION_IMAGE_BUCKET = 'transaction-images';

export interface LocalTransactionImage {
  uri: string;
  mimeType?: string | null;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const extensionOf = (mimeType: string): string => EXTENSION_BY_MIME[mimeType] ?? 'jpg';

const removeObjectPaths = async (objectPaths: string[]): Promise<void> => {
  if (objectPaths.length === 0) return;
  const { error } = await supabase.storage.from(TRANSACTION_IMAGE_BUCKET).remove(objectPaths);
  if (error) throw new Error('删除账单图片失败');
};

/** 从 Supabase Storage 公开 URL 反解出对象路径（用于删除） */
export const transactionImagePathOf = (publicUrl: string): string | null => {
  const marker = `/storage/v1/object/public/${TRANSACTION_IMAGE_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return null;
  const encodedPath = publicUrl.slice(markerIndex + marker.length);
  if (encodedPath === '') return null;
  return encodedPath
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/');
};

export const transactionImageService = {
  /**
   * 将本次新选的本地图片上传到 Storage：
   * - 路径固定为 `<uid>/<ledgerId>/<timestamp>-<index>.<ext>`，Storage 策略只允许本人写自己目录；
   * - 返回公开 URL，最多 3 张；
   * - 任意一步失败会尽力清理本次已上传对象，避免留下孤儿文件。
   */
  async upload(
    ledgerId: string,
    userId: string,
    images: LocalTransactionImage[],
  ): Promise<string[]> {
    if (images.length === 0) return [];
    if (images.length > MAX_TRANSACTION_IMAGES) {
      throw new Error(`每笔最多上传 ${MAX_TRANSACTION_IMAGES} 张图片`);
    }

    const uploadedPaths: string[] = [];
    const urls: string[] = [];
    const timestamp = Date.now();

    try {
      for (const [index, image] of images.entries()) {
        const mimeType = image.mimeType ?? 'image/jpeg';
        const base64 = await FileSystem.readAsStringAsync(image.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const objectPath = `${userId}/${ledgerId}/${timestamp}-${index}.${extensionOf(mimeType)}`;

        const { error } = await supabase.storage
          .from(TRANSACTION_IMAGE_BUCKET)
          .upload(objectPath, decode(base64), { contentType: mimeType, upsert: false });
        if (error) throw new Error('上传账单图片失败');
        uploadedPaths.push(objectPath);

        const { data } = supabase.storage.from(TRANSACTION_IMAGE_BUCKET).getPublicUrl(objectPath);
        if (!data?.publicUrl) throw new Error('获取账单图片地址失败');
        urls.push(data.publicUrl);
      }
      return urls;
    } catch (error) {
      await removeObjectPaths(uploadedPaths).catch(() => undefined);
      throw error;
    }
  },

  /** 删除一组公开 URL 对应的 Storage 对象；无法解析的 URL 静默忽略 */
  async remove(publicUrls: string[]): Promise<void> {
    const objectPaths = publicUrls
      .map(transactionImagePathOf)
      .filter((path): path is string => path !== null);
    await removeObjectPaths(objectPaths);
  },
};
