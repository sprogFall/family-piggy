/**
 * Expo 动态配置：所有环境相关信息一律从环境变量读取，禁止硬编码提交。
 * - 本地开发：复制 .env.example 为 .env 并填写（.env 不会被提交）
 * - CI 打包：GitHub Secrets 直接注入构建环境（.github/workflows/release.yml）
 */
/** 品牌绿：Android 自适应图标背景与原生开屏底色共用同一值，改色只改这里 */
const BRAND_COLOR = '#9DD9BE';
/** 开屏图标展示宽度（pt）：约屏宽一半，过大会被 Android 12+ 的系统遮罩裁到 */
const SPLASH_ICON_WIDTH = 200;

module.exports = {
  expo: {
    name: '家庭记账',
    slug: 'family-piggy',
    // 版本名：CI 打标签时由 tag 注入（v0.1.1 -> 0.1.1）
    version: process.env.APP_VERSION || '0.1.0',
    orientation: 'portrait',
    // 深浅色跟随系统：iOS 由 RN Appearance 直接上报，Android 需要 expo-system-ui 才能真正读到系统深色配置
    userInterfaceStyle: 'automatic',
    // 应用图标：由设计稿裁掉白边生成（圆角方块外的白底用边界色无缝延续成满幅）
    icon: './assets/icon.png',
    // 原生资源 / 字体嵌入（expo install 提示需显式声明，动态配置无法自动写入）
    plugins: [
      'expo-asset',
      'expo-font',
      // 原生开屏（JS 加载之前由系统绘制）：品牌绿底 + 应用图标，避免冷启动闪一下白屏
      [
        'expo-splash-screen',
        {
          image: './assets/icon.png',
          imageWidth: SPLASH_ICON_WIDTH,
          resizeMode: 'contain',
          backgroundColor: BRAND_COLOR,
        },
      ],
    ],
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
        backgroundColor: BRAND_COLOR,
      },
    },
  },
};
