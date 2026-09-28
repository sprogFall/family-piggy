import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { validateEmail, validatePassword } from '@/domain/validation';
import { showAlert } from '@/lib/alert';
import { getErrorMessage } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/stores/auth.store';
import { createStyles, colors, fontSize, radius, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const signIn = useAuthStore((state) => state.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const emailResult = validateEmail(email);
    const passwordResult = validatePassword(password);
    setEmailError(emailResult);
    setPasswordError(passwordResult);
    if (emailResult || passwordResult) return;

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      showAlert('登录失败', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Text style={styles.logoText}>¥</Text>
          </View>
          <Text style={styles.title}>记账本</Text>
          <Text style={styles.subtitle}>记录每一笔，生活更清晰</Text>

          <View style={styles.form}>
            <TextField
              placeholder="邮箱 / 账号"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={emailError}
            />
            <TextField
              placeholder="密码"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={passwordError}
            />
            <PrimaryButton title="登录" onPress={handleSubmit} loading={loading} />
          </View>

          <View style={styles.links}>
            <Pressable onPress={() => showAlert('提示', '请联系管理员重置密码')}>
              <Text style={styles.linkText}>忘记密码</Text>
            </Pressable>
            <Text style={styles.divider}>|</Text>
            <Pressable onPress={() => showAlert('提示', '即将开放，敬请期待')}>
              <Text style={styles.linkText}>短信验证码登录</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>还没有账号？</Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>注册账号</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = createStyles({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: space(8),
  },
  divider: {
    color: colors.border,
  },
  flex: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    marginTop: space(10),
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  form: {
    alignSelf: 'stretch',
    gap: space(4),
    marginTop: space(8),
  },
  links: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(5),
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  logoText: {
    color: colors.white,
    fontSize: 36,
    fontWeight: '700',
  },
  registerText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: space(1),
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: space(4),
  },
});
