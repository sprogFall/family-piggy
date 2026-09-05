import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { validateEmail, validateNickname, validatePassword } from '@/domain/validation';
import { getErrorMessage } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/stores/auth.store';
import { colors, fontSize, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const signUp = useAuthStore((state) => state.signUp);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const nextErrors = {
      nickname: validateNickname(nickname),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: password === confirm ? null : '两次输入的密码不一致',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    try {
      await signUp(email.trim(), password, nickname.trim());
      Alert.alert('注册成功', '欢迎加入，开始记账吧', [
        { text: '好的', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('注册失败', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="注册账号" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <TextField
              placeholder="昵称（1-12 个字符）"
              value={nickname}
              onChangeText={setNickname}
              error={errors.nickname}
            />
            <TextField
              placeholder="邮箱"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
            />
            <TextField
              placeholder="密码（至少 6 位）"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />
            <TextField
              placeholder="确认密码"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
            />
            <PrimaryButton title="注册" onPress={handleSubmit} loading={loading} />
          </View>
          <Text style={styles.tip}>注册即自动创建「个人账本」，随时可创建或加入家庭共同记账</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    padding: space(5),
  },
  flex: {
    flex: 1,
  },
  form: {
    gap: space(4),
  },
  tip: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: space(5),
    textAlign: 'center',
  },
});
