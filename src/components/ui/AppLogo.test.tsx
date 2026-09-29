import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { radius } from '@/theme';

import appIcon from '../../../assets/icon.png';
import { APP_LOGO_SIZE, AppLogo } from './AppLogo';

describe('AppLogo', () => {
  it('渲染应用图标本体（与启动器 / 构建用的是同一份资源）', () => {
    render(<AppLogo />);

    expect(screen.getByTestId('app-logo').props.source).toBe(appIcon);
  });

  it('默认尺寸为排版基准尺寸，并裁成圆角', () => {
    render(<AppLogo />);

    expect(StyleSheet.flatten(screen.getByTestId('app-logo').props.style)).toMatchObject({
      borderRadius: radius.lg,
      height: APP_LOGO_SIZE,
      overflow: 'hidden',
      width: APP_LOGO_SIZE,
    });
  });

  it('可用 size 覆盖尺寸', () => {
    render(<AppLogo size={48} />);

    expect(StyleSheet.flatten(screen.getByTestId('app-logo').props.style)).toMatchObject({
      height: 48,
      width: 48,
    });
  });
});
