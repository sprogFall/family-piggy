import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { showAlert } from '@/lib/alert';
import { createStyles, colors, fontSize, radius, space } from '@/theme';

import { PrimaryButton } from './PrimaryButton';
import { TextField } from './TextField';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  placeholder?: string;
  submitLabel?: string;
  /** 输入长度上限（不传则不限制） */
  maxLength?: number;
  onSubmit: (value: string) => void;
}

export const PromptModal = ({
  visible,
  onClose,
  title,
  placeholder,
  submitLabel = '确定',
  maxLength,
  onSubmit,
}: Props) => {
  const [value, setValue] = useState('');
  const close = () => {
    setValue('');
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.mask} onPress={close}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <TextField
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus
          />
          <View style={styles.actions}>
            <Pressable style={styles.cancel} onPress={close}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <PrimaryButton
              title={submitLabel}
              style={styles.submit}
              onPress={() => {
                const trimmed = value.trim();
                if (!trimmed) {
                  showAlert('提示', '请输入内容');
                  return;
                }
                onSubmit(trimmed);
                close();
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = createStyles({
  actions: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(4),
  },
  cancel: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space(5),
  },
  mask: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space(8),
  },
  submit: {
    flex: 2,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: space(4),
    textAlign: 'center',
  },
});
