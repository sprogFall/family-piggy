import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase 连接信息通过 EXPO_PUBLIC_* 环境变量注入（babel-preset-expo 会将其内联进 bundle）：
 * - 本地：.env 文件（参考 .env.example，已 gitignore）
 * - CI / 云打包：GitHub Secrets -> EAS secrets
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
