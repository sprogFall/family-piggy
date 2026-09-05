import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthNavigator, MainNavigator, navigationRef } from '@/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useLedgerStore } from '@/stores/ledger.store';
import { useTransactionStore } from '@/stores/transaction.store';
import { useCategoryStore } from '@/stores/category.store';
import { colors } from '@/theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    primary: colors.primary,
  },
};

const SplashView = () => (
  <View style={styles.splash}>
    <View style={styles.logo}>
      <Text style={styles.logoText}>¥</Text>
    </View>
    <ActivityIndicator color={colors.primary} style={styles.spinner} />
  </View>
);

export default function App() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    void useAuthStore.getState().initialize();
  }, []);

  useEffect(() => {
    if (status === 'signedIn') {
      void useLedgerStore.getState().load().catch(() => undefined);
    }
    if (status === 'signedOut') {
      useLedgerStore.getState().reset();
      useTransactionStore.getState().reset();
      useCategoryStore.getState().reset();
    }
  }, [status]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {status === 'loading' ? <SplashView /> : status === 'signedIn' ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
});
