import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import appIcon from '../../../assets/icon.png';
import { LoginScreen } from './LoginScreen';

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as never;
const route = {} as never;

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LoginScreen navigation={navigation} route={route} />
    </SafeAreaProvider>,
  );

describe('LoginScreen', () => {
  it('展示应用图标，而不是绿底「¥」占位', () => {
    renderScreen();

    expect(screen.queryByText('¥')).toBeNull();
    expect(screen.getByTestId('app-logo').props.source).toBe(appIcon);
  });

  it('展示应用名与副标题', () => {
    renderScreen();

    expect(screen.getByText('记账本')).toBeTruthy();
    expect(screen.getByText('记录每一笔，生活更清晰')).toBeTruthy();
  });
});
