/**
 * 静态图片资源的模块声明：让 `import icon from '../../../assets/icon.png'`
 * 拿到 `ImageSourcePropType` 而不是要求 `require`（避免用 any 逃逸类型检查）。
 */
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';

  const source: ImageSourcePropType;
  export default source;
}
