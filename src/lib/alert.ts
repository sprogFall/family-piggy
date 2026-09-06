import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

/**
 * 跨平台弹窗提示：
 * - native：Alert.alert
 * - web：react-native-web 的 Alert.alert 是 no-op（只打 console.warn），
 *   改用 window.alert / window.confirm，否则用户看不到任何反馈
 */
export const showAlert = (title: string, message?: string, buttons?: AlertButton[]): void => {
  const text = message ? `${title}\n${message}` : title;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hasCancel = buttons?.some((button) => button.style === 'cancel') ?? false;
    if (hasCancel) {
      if (window.confirm(text)) {
        buttons?.filter((button) => button.style !== 'cancel').at(-1)?.onPress?.();
      } else {
        buttons?.find((button) => button.style === 'cancel')?.onPress?.();
      }
      return;
    }
    window.alert(text);
    buttons?.at(-1)?.onPress?.();
    return;
  }

  Alert.alert(title, message, buttons);
};
