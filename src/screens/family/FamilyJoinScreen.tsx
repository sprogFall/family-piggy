import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { isValidInviteCode } from '@/domain/invite-code';
import { showAlert } from '@/lib/alert';
import { getErrorMessage } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useLedgerStore } from '@/stores/ledger.store';
import { makeStyles, fontSize, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FamilyJoin'>;

export const FamilyJoinScreen = ({ navigation }: Props) => {
  const styles = useStyles();
  const joinFamily = useLedgerStore((state) => state.joinFamily);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!isValidInviteCode(code)) {
      showAlert('提示', '请输入 8 位邀请码');
      return;
    }
    setLoading(true);
    try {
      await joinFamily(code);
      showAlert('加入成功', '已切换到家庭账本', [
        { text: '好的', onPress: () => navigation.popToTop() },
      ]);
    } catch (caught) {
      showAlert('加入失败', getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="加入家庭" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          label="邀请码"
          placeholder="输入 8 位邀请码"
          autoCapitalize="characters"
          value={code}
          maxLength={12}
          onChangeText={(value) => setCode(value.toUpperCase())}
        />
        <PrimaryButton title="加入家庭" onPress={() => void handleSubmit()} loading={loading} />
        <Text style={styles.tip}>邀请码由家庭创建者在「家庭详情」中分享获得。</Text>
      </ScrollView>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    gap: space(5),
    padding: space(4),
  },
  tip: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
}));
