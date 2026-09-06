import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { showAlert } from '@/lib/alert';
import { useAuthStore } from '@/stores/auth.store';
import type { RootStackParamList } from '@/navigation/types';
import { selectMembers, useLedgerStore } from '@/stores/ledger.store';
import { colors, fontSize, radius, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FamilyDetail'>;

export const FamilyDetailScreen = ({ navigation, route }: Props) => {
  const { familyId } = route.params;
  const family = useLedgerStore((state) =>
    state.families.find((item) => item.family.id === familyId)?.family,
  );
  const members = useLedgerStore((state) => selectMembers(state, familyId));
  const loadMembers = useLedgerStore((state) => state.loadMembers);
  const removeMember = useLedgerStore((state) => state.removeMember);
  const leaveFamily = useLedgerStore((state) => state.leaveFamily);
  const disbandFamily = useLedgerStore((state) => state.disbandFamily);
  const userId = useAuthStore((state) => state.session?.user.id ?? '');

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadMembers(familyId).catch((error) =>
      showAlert('加载失败', error instanceof Error ? error.message : '请稍后再试'),
    );
  }, [familyId, loadMembers]);

  if (!family) {
    return (
      <View style={styles.container}>
        <AppHeader title="家庭详情" onBack={() => navigation.goBack()} />
        <EmptyState message="家庭不存在或已被解散" />
      </View>
    );
  }

  const isOwner = family.ownerId === userId;

  const invite = () => {
    void Share.share({
      message: `邀请你加入家庭「${family.name}」，邀请码：${family.inviteCode}，在 App 中选择「加入家庭」即可一起记账。`,
    });
  };

  const confirmLeave = () => {
    showAlert('退出家庭', '退出后将无法继续在家庭账本记账', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void leaveFamily(familyId)
            .then(() => navigation.popToTop())
            .catch((error) => showAlert('操作失败', error.message))
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  const confirmDisband = () => {
    showAlert('解散家庭', '解散后家庭账本与全部流水将被删除，无法恢复！', [
      { text: '取消', style: 'cancel' },
      {
        text: '解散',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void disbandFamily(familyId)
            .then(() => navigation.popToTop())
            .catch((error) => showAlert('操作失败', error.message))
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="家庭详情" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.familyName}>{family.name}</Text>
          <Pressable style={styles.codeRow} onPress={invite}>
            <Text style={styles.codeLabel}>邀请码</Text>
            <Text style={styles.code}>{family.inviteCode}</Text>
            <Ionicons name="share-social-outline" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>成员（{members.length}）</Text>
        <View style={styles.card}>
          {members.map((member) => (
            <View key={member.userId} style={styles.memberRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.nickname.slice(0, 1)}</Text>
              </View>
              <Text style={styles.memberName}>{member.nickname}</Text>
              {member.role === 'owner' ? (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerText}>创建人</Text>
                </View>
              ) : null}
              <View style={styles.memberRight}>
                {isOwner && member.userId !== userId ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      showAlert('移除成员', `确定将「${member.nickname}」移出家庭吗？`, [
                        { text: '取消', style: 'cancel' },
                        {
                          text: '移除',
                          style: 'destructive',
                          onPress: () =>
                            void removeMember(familyId, member.userId).catch((error) =>
                              showAlert('操作失败', error.message),
                            ),
                        },
                      ])
                    }
                  >
                    <Ionicons name="remove-circle-outline" size={22} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {isOwner ? (
          <PrimaryButton title="解散家庭" variant="danger" onPress={confirmDisband} disabled={busy} />
        ) : (
          <PrimaryButton title="退出家庭" variant="danger" onPress={confirmLeave} disabled={busy} />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.round,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: space(4),
    padding: space(4),
  },
  code: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: 2,
  },
  codeLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginRight: space(3),
  },
  codeRow: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: space(3),
    paddingHorizontal: space(3),
    paddingVertical: space(3),
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    padding: space(4),
  },
  familyName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  memberName: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
    marginHorizontal: space(3),
  },
  memberRight: {
    alignItems: 'flex-end',
  },
  memberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: space(2),
  },
  ownerBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.round,
    paddingHorizontal: space(2),
    paddingVertical: 2,
  },
  ownerText: {
    color: colors.primary,
    fontSize: fontSize.xs,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: space(2),
  },
});
