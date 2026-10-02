import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import type { FamilyMember } from '@/types/domain';
import { makeStyles, useColors, fontSize, space } from '@/theme';

interface Props {
  visible: boolean;
  members: FamilyMember[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (userId: string | null) => void;
}

export const MemberFilterSheet = ({
  visible,
  members,
  selectedId,
  onClose,
  onSelect,
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const choose = (userId: string | null) => {
    onSelect(userId);
    onClose();
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title="按成员筛选">
      <ScrollView style={styles.list}>
        <Pressable style={styles.row} onPress={() => choose(null)}>
          <Text style={[styles.name, selectedId === null ? styles.active : null]}>全部成员</Text>
          {selectedId === null ? (
            <Ionicons name="checkmark" size={18} color={colors.primary} />
          ) : null}
        </Pressable>
        {members.map((member) => {
          const active = member.userId === selectedId;
          return (
            <Pressable key={member.userId} style={styles.row} onPress={() => choose(member.userId)}>
              <Text style={[styles.name, active ? styles.active : null]} numberOfLines={1}>
                {member.nickname}
              </Text>
              {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
};

const useStyles = makeStyles((colors) => ({
  active: {
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    marginBottom: space(2),
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: space(3),
  },
}));
