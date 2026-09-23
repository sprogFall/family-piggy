import { create } from 'zustand';

/** 浮窗展示时长（毫秒） */
export const TOAST_DURATION_MS = 2200;

interface ToastState {
  /** 当前浮窗文案，null 表示不展示 */
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

const clearTimer = (): void => {
  if (timer === null) return;
  clearTimeout(timer);
  timer = null;
};

/** 全局浮窗：跨屏幕展示（如记账成功提示），到时自动隐藏 */
export const useToastStore = create<ToastState>((set) => ({
  message: null,

  show: (message) => {
    clearTimer();
    set({ message });
    timer = setTimeout(() => {
      timer = null;
      set({ message: null });
    }, TOAST_DURATION_MS);
  },

  hide: () => {
    clearTimer();
    set({ message: null });
  },
}));
