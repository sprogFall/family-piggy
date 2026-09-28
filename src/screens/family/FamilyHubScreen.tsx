import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/EmptyState';
import { AppHeader } from '@/components/ui/AppHeader';
import type { RootStackParamList } from '@/navigation/types';
import { useLedgerStore } from '@/stores/ledger.store';
import { createStyles, colors, fontSize, radius, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FamilyHub'>;

export const FamilyHubScreen = ({ navigation }: Props) => {
  const families = useLedgerStore((state) => state.families);
  const ledgers = useLedgerStore((state) => state.ledgers);
  const load = useLedgerStore((state) => state.load);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => undefined);
    }, []),
  );

  return (
    <View style={styles.container}>
      <AppHeader title="家庭管理" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('FamilyCreate')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="home-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.actionTitle}>创建家庭</Text>
            <Text style={styles.actionDesc}>和家人一起记账</Text>
          </Pressable>
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('FamilyJoin')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F1FD' }]}>
              <Ionicons name="people-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.actionTitle}>加入家庭</Text>
            <Text style={styles.actionDesc}>输入邀请码加入</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>我的家庭</Text>
        {families.length === 0 ? (
          <EmptyState icon="people-outline" message="还没有加入任何家庭" />
        ) : (
          families.map(({ family, ledgerId }) => {
            const ledgerName = ledgers.find((l) => l.id === ledgerId)?.name ?? '未创建账本';
            return (
              <Pressable
                key={family.id}
                style={styles.familyRow}
                onPress={() =>
                  navigation.navigate('FamilyDetail', { familyId: family.id })
                }
              >
                <View style={styles.familyIcon}>
                  <Ionicons name="people" size={20} color={colors.white} />
                </View>
                <View style={styles.familyMeta}>
                  <Text style={styles.familyName}>{family.name}</Text>
                  <Text style={styles.familyLedger}>家庭账本：{ledgerName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = createStyles({
  actionCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    flex: 1,
    padding: space(5),
  },
  actionDesc: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: space(1),
  },
  actionIcon: {
    alignItems: 'center',
    borderRadius: radius.round,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  actionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: space(2),
  },
  actions: {
    flexDirection: 'row',
    gap: space(3),
  },
  content: {
    padding: space(4),
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  familyIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  familyLedger: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  familyMeta: {
    flex: 1,
    marginHorizontal: space(3),
  },
  familyName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  familyRow: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: space(2),
    paddingHorizontal: space(3),
    paddingVertical: space(3),
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: space(5),
  },
});
