import { Image } from 'react-native';

import { makeStyles, radius } from '@/theme';

import appIcon from '../../../assets/icon.png';

/** 应用图标默认展示尺寸：开屏 / 登录页 / 关于页的排版基准 */
export const APP_LOGO_SIZE = 72;

interface Props {
  /** 覆盖默认尺寸（正方形，单位 pt） */
  size?: number;
}

/**
 * 应用图标：与应用启动器、构建产物用的是同一份 `assets/icon.png`。
 *
 * 开屏 / 登录页 / 关于页统一走这里，避免再出现「绿底 ¥」这类与真实图标不一致的占位
 * （换图标只需覆盖 `assets/` 下的 PNG，见手册 19.9）。
 */
export const AppLogo = ({ size = APP_LOGO_SIZE }: Props) => {
  const styles = useStyles();
  return (
    <Image
      testID="app-logo"
      source={appIcon}
      style={[styles.logo, { height: size, width: size }]}
      resizeMode="cover"
    />
  );
};

const useStyles = makeStyles(() => ({
  logo: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
}));
