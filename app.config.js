/**
 * Expo 动态配置：所有环境相关信息一律从环境变量读取，禁止硬编码提交。
 * - 本地开发：复制 .env.example 为 .env 并填写（.env 不会被提交）
 * - CI / 云打包：GitHub Secrets -> EAS secrets 注入
 */
module.exports = {
  expo: {
    name: '家庭记账',
    slug: 'family-piggy',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.familypiggy.app',
      infoPlist: {
        NSPhotoLibraryUsageDescription: '用于选择图片作为头像',
      },
    },
    android: {
      package: 'com.familypiggy.app',
    },
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID ?? '',
      },
    },
  },
};
