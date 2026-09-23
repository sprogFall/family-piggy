import { TOAST_DURATION_MS, useToastStore } from './toast.store';

describe('useToastStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useToastStore.getState().hide();
  });

  afterEach(() => {
    useToastStore.getState().hide();
    jest.useRealTimers();
  });

  it('show 后立即展示文案', () => {
    useToastStore.getState().show('记账成功');
    expect(useToastStore.getState().message).toBe('记账成功');
  });

  it('到时后自动隐藏', () => {
    useToastStore.getState().show('记账成功');
    jest.advanceTimersByTime(TOAST_DURATION_MS - 1);
    expect(useToastStore.getState().message).toBe('记账成功');

    jest.advanceTimersByTime(1);
    expect(useToastStore.getState().message).toBeNull();
  });

  it('展示期间再次 show 会重新计时', () => {
    useToastStore.getState().show('已保存');
    jest.advanceTimersByTime(TOAST_DURATION_MS - 100);
    useToastStore.getState().show('已保存');

    jest.advanceTimersByTime(100);
    expect(useToastStore.getState().message).toBe('已保存');

    jest.advanceTimersByTime(TOAST_DURATION_MS - 100);
    expect(useToastStore.getState().message).toBeNull();
  });

  it('hide 立即清除并取消计时', () => {
    useToastStore.getState().show('记账成功');
    useToastStore.getState().hide();
    expect(useToastStore.getState().message).toBeNull();

    jest.advanceTimersByTime(TOAST_DURATION_MS);
    expect(useToastStore.getState().message).toBeNull();
  });
});
