import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Share, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PromptModal } from '@/components/ui/PromptModal';
import { validateFamilyName } from '@/domain/validation';
import { showAlert } from '@/lib/alert';
import { useAuthStore } from '@/stores/auth.store';
import type { RootStackParamList } from '@/navigation/types';
import { selectMembers, useLedgerStore } from '@/stores/ledger.store';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FamilyDetail'>;

export const FamilyDetailScreen = ({ navigation, route }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const { familyId } = route.params;
  const family = useLedgerStore((state) =>
    state.families.find((item) => item.family.id === familyId)?.family,
  );
  const members = useLedgerStore((state) => selectMembers(state, familyId));
  const loadMembers = useLedgerStore((state) => state.loadMembers);
  const removeMember = useLedgerStore((state) => state.removeMember);
  const leaveFamily = useLedgerStore((state) => state.leaveFamily);
  const disbandFamily = useLedgerStore((state) => state.disbandFamily);
  const renameFamily = useLedgerStore((state) => state.renameFamily);
  const regenerateInviteCode = useLedgerStore((state) => state.regenerateInviteCode);
  const userId = useAuthStore((state) => state.session?.user.id ?? '');

  const [busy, setBusy] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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

  const handleRename = async (name: string) => {
    const error = validateFamilyName(name);
    if (error) {
      showAlert('提示', error);
      return;
    }
    try {
      await renameFamily(familyId, name.trim());
      showAlert('家庭名称已更新');
    } catch (renameError) {
      showAlert('修改失败', renameError instanceof Error ? renameError.message : '请稍后再试');
    }
  };

  const confirmRegenerate = () => {
    showAlert('重新生成邀请码', '旧邀请码将立即失效，确定重新生成吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '重新生成',
        style: 'destructive',
        onPress: () => {
          setRegenerating(true);
          void regenerateInviteCode(familyId)
            .then((code) => showAlert('已重新生成', `新邀请码：${code}`))
            .catch((error) =>
              showAlert('操作失败', error instanceof Error ? error.message : '请稍后再试'),
            )
            .finally(() => setRegenerating(false));
        },
      },
    ]);
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="修改家庭名称"
            style={styles.familyNameRow}
            disabled={!isOwner}
            onPress={() => setShowRenameModal(true)}
          >
            <Text style={styles.familyName}>{family.name}</Text>
            {isOwner ? <Ionicons name="pencil" size={16} color={colors.textTertiary} /> : null}
          </Pressable>
          <Pressable style={styles.codeRow} onPress={invite}>
            <Text style={styles.codeLabel}>邀请码</Text>
            <Text style={styles.code}>{family.inviteCode}</Text>
            <Ionicons name="share-social-outline" size={16} color={colors.primary} />
          </Pressable>
          {isOwner ? (
            <Pressable
              accessibilityRole="button"
              style={styles.regenerate}
              disabled={regenerating}
              onPress={confirmRegenerate}
            >
              <Ionicons name="refresh-outline" size={15} color={colors.primary} />
              <Text style={styles.regenerateText}>{regenerating ? '生成中…' : '重新生成邀请码'}</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>成员（{members.length}）</Text>
        <View style={styles.card}>
          {members.map((member) => (
            <View key={member.userId} style={styles.memberRow}>
              <View style={styles.avatar}>
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{member.nickname.slice(0, 1)}</Text>
                )}
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

      <PromptModal
        visible={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="修改家庭名称"
        initialValue={family.name}
        placeholder="家庭名称（1-12 个字符）"
        submitLabel="保存"
        maxLength={12}
        onSubmit={(name) => void handleRename(name)}
      />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.round,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  avatarImage: {
    height: 40,
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
  familyNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(2),
  },
  regenerate: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(1),
    marginTop: space(3),
  },
  regenerateText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
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
}));
