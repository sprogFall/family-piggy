/**
 * Jest 全局测试环境：屏蔽原生模块与网络，保证测试离线、确定性。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///docs/',
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(async () => undefined),
  readAsStringAsync: jest.fn(async () => ''),
  deleteAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({ exists: false, isDirectory: false, size: 0, uri: '' })),
  makeDirectoryAsync: jest.fn(async () => undefined),
  readDirectoryAsync: jest.fn(async () => []),
  getContentUriAsync: jest.fn(async (uri: string) => uri),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(async () => ({ status: 200, uri: 'file:///docs/updates/family-piggy.apk' })),
  })),
}));

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn(async () => undefined),
}));

jest.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
    sheet_to_json: jest.fn(() => []),
  },
  write: jest.fn(() => 'base64data'),
  read: jest.fn(),
}));

// Supabase 连接信息：与运行时一致，通过 EXPO_PUBLIC_* 环境变量注入
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// 图标组件测试环境 stub：避免加载字体文件
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const iconStub = React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
    React.createElement(Text, { ...props, ref }, String(props.name ?? '')),
  );
  return new Proxy(
    { __esModule: true },
    {
      get: (target: Record<string, unknown>, prop: string | symbol) =>
        prop in target ? target[prop as string] : iconStub,
    },
  );
});

jest.mock('@/lib/supabase', () => {
  const makeChannel = () => {
    const channel: Record<string, unknown> = {};
    channel.on = jest.fn(() => channel);
    channel.subscribe = jest.fn(() => ({ unsubscribe: jest.fn() }));
    return channel;
  };
  return {
    supabase: {
      auth: {
        getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
        signInWithPassword: jest.fn(async () => ({ data: {}, error: null })),
        signUp: jest.fn(async () => ({ data: {}, error: null })),
        signOut: jest.fn(async () => ({ error: null })),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
      },
      from: jest.fn(),
      rpc: jest.fn(),
      channel: jest.fn(() => makeChannel()),
      removeChannel: jest.fn(async () => 'ok'),
      storage: { from: jest.fn() },
    },
  };
});
