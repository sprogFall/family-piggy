import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useColors, fontSize, space } from '@/theme';

interface Props {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

export const AppHeader = ({ title, onBack, right }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + space(2) }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <Pressable hitSlop={12} onPress={onBack}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.side, styles.rightSide]}>{right}</View>
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    backgroundColor: colors.bg,
    paddingBottom: space(2),
    paddingHorizontal: space(4),
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  side: {
    minWidth: 32,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
}));
