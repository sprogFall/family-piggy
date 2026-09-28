import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { validateFamilyName } from '@/domain/validation';
import { showAlert } from '@/lib/alert';
import { getErrorMessage } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useLedgerStore } from '@/stores/ledger.store';
import { makeStyles, fontSize, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FamilyCreate'>;

export const FamilyCreateScreen = ({ navigation }: Props) => {
  const styles = useStyles();
  const createFamily = useLedgerStore((state) => state.createFamily);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const error = validateFamilyName(name);
    if (error) {
      showAlert('提示', error);
      return;
    }
    setLoading(true);
    try {
      await createFamily(name.trim());
      showAlert('创建成功', '已自动创建家庭账本，可邀请成员加入', [
        { text: '好的', onPress: () => navigation.popToTop() },
      ]);
    } catch (caught) {
      showAlert('创建失败', getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="创建家庭" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          label="家庭名称"
          placeholder="例如：幸福之家"
          value={name}
          maxLength={12}
          onChangeText={setName}
        />
        <PrimaryButton title="创建家庭" onPress={() => void handleSubmit()} loading={loading} />
        <Text style={styles.tip}>
          创建后将自动生成家庭账本与邀请码，家人凭邀请码加入后即可共同记账。
        </Text>
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
    lineHeight: 20,
  },
}));
