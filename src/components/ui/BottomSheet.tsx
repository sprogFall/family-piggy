import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, space } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const BottomSheet = ({ visible, onClose, title, children }: Props) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.mask} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
        <View style={styles.handle} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radius.round,
    height: 4,
    marginBottom: space(2),
    width: 36,
  },
  mask: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
    paddingBottom: space(6),
    paddingHorizontal: space(4),
    paddingTop: space(2),
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: space(2),
    textAlign: 'center',
  },
});
