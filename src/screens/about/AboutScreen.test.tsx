import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as updateService from '@/services/update.service';

import appIcon from '../../../assets/icon.png';
import { AboutScreen } from './AboutScreen';

jest.mock('@/services/update.service');

const mocked = updateService as jest.Mocked<typeof updateService>;

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as never;
const route = {} as never;

const renderScreen = async () => {
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AboutScreen navigation={navigation} route={route} />
    </SafeAreaProvider>,
  );
  // 版本卡片挂载后会异步检查更新：等它落地，避免更新落在 act() 之外
  await screen.findByText(/暂时无法获取更新信息/);
};

describe('AboutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.fetchLatestRelease.mockReset();
    mocked.getCurrentVersion.mockReturnValue('0.1.8');
    // 版本卡片不在本用例关注范围内：让它稳定落在「拿不到更新信息」分支
    mocked.fetchLatestRelease.mockResolvedValue(null);
  });

  it('展示应用图标本身，而不是绿底「¥」占位', async () => {
    await renderScreen();

    expect(screen.queryByText('¥')).toBeNull();
    expect(screen.getByTestId('app-logo').props.source).toBe(appIcon);
  });

  it('展示应用名与简介', async () => {
    await renderScreen();

    expect(screen.getByText('家庭记账')).toBeTruthy();
    expect(screen.getByText(/个人账本与家庭账本/)).toBeTruthy();
  });
});
