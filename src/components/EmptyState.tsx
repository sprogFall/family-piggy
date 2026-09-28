import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { makeStyles, useColors, fontSize, space } from '@/theme';

interface Props {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  message: string;
}

export const EmptyState = ({ icon = 'file-tray-full-outline', message }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.textTertiary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    alignItems: 'center',
    paddingVertical: space(12),
  },
  text: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: space(2),
  },
}));
