/**
 * 用例默认超时从 jest 的 5s 放宽到 20s。
 *
 * 原因：jest 的 transform 缓存是冷的（CI 每次 `npm ci` 后要重新编译整个 RN 依赖图），
 * 而 `@testing-library/react-native` 的**第一次** `render()` 会懒加载 RN 渲染路径上的
 * 一大批模块，这份一次性开销算在「该测试文件第一个用例」的预算里：
 *   本机冷缓存 = 3.9s（第二次 render 只要 5ms，与用例内容无关），
 *   CI（ubuntu-24.04，2 核，无 jest 缓存）= 更久，于是本文件第一个用例偶发 5s 超时，
 *   报错位置还指向某个与耗时无关的用例（例如 UpdateCard 的「进入页面自动检查…」）。
 *
 * 注意这不是把用例改慢：所有用例实际耗时仍是毫秒级，放宽的只是「冷启动成本 + 慢机型」
 * 的余量；真有死循环/永不 resolve 的 bug 依然会在 20s 内失败。
 */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|zustand)/',
  ],
  testTimeout: 20000,
};
