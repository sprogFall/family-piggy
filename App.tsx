import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SplashView } from '@/components/SplashView';
import { DialogHost } from '@/components/ui/DialogHost';
import { Toast } from '@/components/ui/Toast';
import { AuthNavigator, MainNavigator, navigationRef } from '@/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useLedgerStore } from '@/stores/ledger.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTagStore } from '@/stores/tag.store';
import { useThemeStore } from '@/stores/theme.store';
import { useTransactionStore } from '@/stores/transaction.store';
import { useCategoryStore } from '@/stores/category.store';
import { toColorScheme, useColors } from '@/theme';

export default function App() {
  const status = useAuthStore((state) => state.status);
  const scheme = useThemeStore((state) => state.scheme);
  const colors = useColors();

  useEffect(() => {
    void useAuthStore.getState().initialize();
    void useSettingsStore.getState().hydrate();
    void useThemeStore.getState().hydrate();
    // 系统深浅色变化：仅「跟随系统」档位会随之切换
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      useThemeStore.getState().setSystemScheme(toColorScheme(colorScheme));
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (status === 'signedIn') {
      void useLedgerStore.getState().load().catch(() => undefined);
    }
    if (status === 'signedOut') {
      useLedgerStore.getState().reset();
      useTransactionStore.getState().reset();
      useCategoryStore.getState().reset();
      useTagStore.getState().reset();
    }
  }, [status]);

  // 导航容器主题：跟随当前配色，避免切页时闪出浅色底
  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.card,
        border: colors.border,
        primary: colors.primary,
        text: colors.text,
      },
    };
  }, [scheme, colors]);

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {status === 'loading' ? <SplashView /> : status === 'signedIn' ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
      <Toast />
      <DialogHost />
    </SafeAreaProvider>
  );
}

