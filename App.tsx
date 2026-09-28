import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Appearance, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toast } from '@/components/ui/Toast';
import { AuthNavigator, MainNavigator, navigationRef } from '@/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useLedgerStore } from '@/stores/ledger.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTagStore } from '@/stores/tag.store';
import { useThemeStore } from '@/stores/theme.store';
import { useTransactionStore } from '@/stores/transaction.store';
import { useCategoryStore } from '@/stores/category.store';
import { makeStyles, toColorScheme, useColors } from '@/theme';

const SplashView = () => {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.splash}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>¥</Text>
      </View>
      <ActivityIndicator color={colors.primary} style={styles.spinner} />
    </View>
  );
};

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
    </SafeAreaProvider>
  );
}

const useStyles = makeStyles((colors) => ({
  logo: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  logoText: {
    color: colors.white,
    fontSize: 36,
    fontWeight: '700',
  },
  splash: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    flex: 1,
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 24,
  },
}));
