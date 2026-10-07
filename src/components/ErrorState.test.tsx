import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorBanner, ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('整屏兜底展示提示与「重试」按钮，点击触发重试', () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} />);

    expect(screen.getByText('加载失败，请检查网络后重试')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: '重试' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('支持自定义失败文案', () => {
    const onRetry = jest.fn();
    render(<ErrorState message="账单加载失败" onRetry={onRetry} />);

    expect(screen.getByText('账单加载失败')).toBeTruthy();
  });
});

describe('ErrorBanner', () => {
  it('提示刷新失败并可重试', () => {
    const onRetry = jest.fn();
    render(<ErrorBanner onRetry={onRetry} />);

    expect(screen.getByText('刷新失败，当前展示的是本地缓存')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: '重试' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
