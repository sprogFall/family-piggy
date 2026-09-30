import { useSyncExternalStore } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import {
  dismissDialog,
  getDialogRequest,
  pressDialogButton,
  subscribeDialog,
} from '@/lib/alert';
import { makeStyles, fontSize, radius, space } from '@/theme';

import { PrimaryButton } from './PrimaryButton';

/** 全局 App 风格弹窗宿主：挂载一次，所有 showAlert 都从这里渲染 */
export const DialogHost = () => {
  const styles = useStyles();
  const request = useSyncExternalStore(subscribeDialog, getDialogRequest, getDialogRequest);
  if (request === null) return null;

  const cancelButton = request.buttons.find((button) => button.style === 'cancel');

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (cancelButton) pressDialogButton(cancelButton);
        else dismissDialog();
      }}
    >
      <View style={styles.mask}>
        <View style={styles.card}>
          <Text style={styles.title}>{request.title}</Text>
          {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
          <View style={styles.actions}>
            {request.buttons.map((button, index) =>
              button.style === 'cancel' ? (
                <Pressable
                  key={`${button.text}-${index}`}
                  accessibilityRole="button"
                  style={styles.cancel}
                  onPress={() => pressDialogButton(button)}
                >
                  <Text style={styles.cancelText}>{button.text}</Text>
                </Pressable>
              ) : (
                <PrimaryButton
                  key={`${button.text}-${index}`}
                  title={button.text}
                  variant={button.style === 'destructive' ? 'danger' : 'primary'}
                  style={styles.action}
                  onPress={() => pressDialogButton(button)}
                />
              ),
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const useStyles = makeStyles((colors) => ({
  action: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(5),
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
    fontWeight: '500',
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space(5),
  },
  mask: {
    alignItems: 'center',
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space(8),
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: space(2),
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
}));
