export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogRequest {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

let current: DialogRequest | null = null;
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) listener();
};

const normalizeButtons = (buttons?: AlertButton[]): AlertButton[] =>
  buttons && buttons.length > 0 ? buttons : [{ text: '好的' }];

/**
 * 统一弹窗入口：所有提示 / 确认都通过它进入根组件 DialogHost 渲染，
 * 禁止业务代码直接调用 React Native Alert.alert / window.confirm。
 */
export const showAlert = (title: string, message?: string, buttons?: AlertButton[]): void => {
  current = { title, message, buttons: normalizeButtons(buttons) };
  emit();
};

export const subscribeDialog = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getDialogRequest = (): DialogRequest | null => current;

export const dismissDialog = (): void => {
  if (current === null) return;
  current = null;
  emit();
};

export const pressDialogButton = (button: AlertButton): void => {
  dismissDialog();
  button.onPress?.();
};
