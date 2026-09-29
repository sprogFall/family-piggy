import { render, screen } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';

import appIcon from '../../assets/icon.png';
import { SplashView } from './SplashView';

describe('SplashView', () => {
  it('开屏展示应用图标，而不是绿底「¥」占位', () => {
    render(<SplashView />);

    expect(screen.queryByText('¥')).toBeNull();
    expect(screen.getByTestId('app-logo').props.source).toBe(appIcon);
  });

  it('同时展示加载指示器', () => {
    render(<SplashView />);

    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });
});
