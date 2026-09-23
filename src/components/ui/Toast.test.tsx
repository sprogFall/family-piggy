import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useToastStore } from '@/stores/toast.store';

import { Toast } from './Toast';

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

/** 与组件内 FADE_MS 对应的稳定推进量，避免动画更新落在 act 之外 */
const FLUSH_MS = 400;

const renderToast = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <Toast />
    </SafeAreaProvider>,
  );

const show = (message: string) =>
  act(() => {
    useToastStore.getState().show(message);
    jest.advanceTimersByTime(FLUSH_MS);
  });

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      useToastStore.getState().hide();
      jest.advanceTimersByTime(FLUSH_MS);
    });
    jest.useRealTimers();
  });

  it('无文案时不渲染浮窗', () => {
    renderToast();
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('show 后渲染文案且不拦截触摸', () => {
    renderToast();
    show('记账成功');

    expect(screen.getByText('记账成功')).toBeTruthy();
    expect(screen.getByTestId('toast').props.pointerEvents).toBe('none');
  });
});
