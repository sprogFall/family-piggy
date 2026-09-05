import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { categoryVisual } from '@/theme/icons';

interface Props {
  iconKey: string;
  size?: number;
  selected?: boolean;
}

export const CategoryIcon = ({ iconKey, size = 40, selected = false }: Props) => {
  const visual = categoryVisual(iconKey, colors.textSecondary);
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: selected ? colors.primary : `${visual.color}1F`,
        },
      ]}
    >
      <Ionicons
        name={visual.icon}
        size={Math.round(size * 0.5)}
        color={selected ? colors.white : visual.color}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
