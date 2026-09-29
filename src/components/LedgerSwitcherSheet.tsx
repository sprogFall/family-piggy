import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useLedgerStore } from '@/stores/ledger.store';
import type { Ledger } from '@/types/domain';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

import { BottomSheet } from './ui/BottomSheet';
import { PrimaryButton } from './ui/PrimaryButton';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (ledger: Ledger) => void;
  title?: string;
  /** 未传时高亮当前全局账本；导入等场景可高亮本次选中的目标账本 */
  selectedId?: string;
  /** 是否展示底部「新建个人账本 / 家庭管理」操作 */
  showActions?: boolean;
  onCreatePersonal?: () => void;
  onManageFamilies?: () => void;
}

export const LedgerSwitcherSheet = ({
  visible,
  onClose,
  onSelect,
  title = '切换账本',
  selectedId,
  showActions = true,
  onCreatePersonal,
  onManageFamilies,
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const ledgers = useLedgerStore((state) => state.ledgers);
  const activeLedgerId = useLedgerStore((state) => state.activeLedgerId);
  const highlightedId = selectedId ?? activeLedgerId;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {ledgers.map((ledger) => {
        const active = ledger.id === highlightedId;
        return (
          <Pressable
            key={ledger.id}
            style={styles.item}
            onPress={() => {
              onSelect(ledger);
              onClose();
            }}
          >
            <CategoryIcon iconKey={ledger.type === 'family' ? 'people' : 'wallet'} size={36} />
            <Text style={[styles.itemName, active ? styles.active : null]} numberOfLines={1}>
              {ledger.name}
            </Text>
            <View style={[styles.badge, ledger.type === 'family' ? styles.family : null]}>
              <Text style={styles.badgeText}>{ledger.type === 'family' ? '家庭' : '个人'}</Text>
            </View>
            {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
          </Pressable>
        );
      })}

      {showActions ? (
        <View style={styles.footer}>
          {onCreatePersonal ? <PrimaryButton title="＋ 新建个人账本" onPress={onCreatePersonal} /> : null}
          {onManageFamilies ? (
            <Pressable style={styles.manage} onPress={onManageFamilies}>
              <Text style={styles.manageText}>家庭管理（创建 / 加入）</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
};

const useStyles = makeStyles((colors) => ({
  active: {
    color: colors.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.bg,
    borderRadius: radius.round,
    paddingHorizontal: space(2),
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  family: {
    backgroundColor: colors.primaryLight,
  },
  footer: {
    marginTop: space(3),
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: space(2),
  },
  itemName: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
    marginHorizontal: space(3),
  },
  manage: {
    alignItems: 'center',
    paddingVertical: space(3),
  },
  manageText: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
}));
