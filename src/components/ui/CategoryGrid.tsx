import { Pressable, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/CategoryIcon';
import type { Category } from '@/types/domain';
import { createStyles, colors, fontSize, space } from '@/theme';

interface Props {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
}

export const CategoryGrid = ({ categories, selectedId, onSelect }: Props) => (
  <View style={styles.grid}>
    {categories.map((category) => {
      const selected = category.id === selectedId;
      return (
        <Pressable
          key={category.id}
          style={styles.item}
          onPress={() => onSelect(category)}
        >
          <CategoryIcon iconKey={category.icon} size={44} selected={selected} />
          <Text style={[styles.label, selected ? styles.labelActive : null]} numberOfLines={1}>
            {category.name}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = createStyles({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space(2),
  },
  item: {
    alignItems: 'center',
    paddingVertical: space(2),
    width: '20%',
  },
  label: {
    color: colors.text,
    fontSize: fontSize.xs,
    marginTop: space(1),
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
