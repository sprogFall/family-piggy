import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 业务快照：store 启动时先用它渲染上次的数据，随后由网络结果覆盖（stale-while-revalidate）。
 *
 * 这里只做「按 key 读写 JSON」这一件事，不承载任何业务状态；key 由各 store 负责拼装，
 * 且必须带 userId——否则同设备切换账号会读到别人的账本与流水。
 */

/** 读取快照：不存在或内容损坏都返回 null，调用方按「没有缓存」处理 */
export const readSnapshot = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/** 写入快照：失败只影响下次启动的缓存命中，不阻塞当前交互 */
export const writeSnapshot = (key: string, value: unknown): void => {
  void AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => undefined);
};

/** 删除快照（登出 / 切换账号时清理，避免残留上一个账号的数据） */
export const removeSnapshot = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // 清理失败不阻塞登出流程
  }
};
