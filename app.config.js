/**
 * Expo 动态配置：所有环境相关信息一律从环境变量读取，禁止硬编码提交。
 * - 本地开发：复制 .env.example 为 .env 并填写（.env 不会被提交）
 * - CI 打包：GitHub Secrets 直接注入构建环境（.github/workflows/release.yml）
 */
module.exports = {
  expo: {
    name: '家庭记账',
    slug: 'family-piggy',
    // 版本名：CI 打标签时由 tag 注入（v0.1.1 -> 0.1.1）
    version: process.env.APP_VERSION || '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    // 应用图标：由设计稿裁掉白边生成（圆角方块外的白底用边界色无缝延续成满幅）
    icon: './assets/icon.png',
    // 原生资源 / 字体嵌入（expo install 提示需显式声明，动态配置无法自动写入）
    plugins: ['expo-asset', 'expo-font'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.familypiggy.app',
      infoPlist: {
        NSPhotoLibraryUsageDescription: '用于选择图片作为头像',
      },
    },
    android: {
      package: 'com.familypiggy.app',
      // 版本号：CI 中由工作流运行序号注入，保证后续 APK 可覆盖升级
      versionCode: Number(process.env.ANDROID_VERSION_CODE || 1),
      // 应用内更新需要拉起系统安装器安装下载下来的 APK
      permissions: ['REQUEST_INSTALL_PACKAGES'],
      // 自适应图标（Android 8+）：前景同为满幅无缝图，主体内容收在安全区内，
      // 圆形 / 圆角方形遮罩都不会裁到笔记本、铅笔与叶子
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#9DD9BE',
      },
    },
  },
};
