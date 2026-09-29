import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ImportDataPreview } from '@/components/ImportDataPreview';
import { ImportRecorderMapping, type RecorderOption } from '@/components/ImportRecorderMapping';
import { LedgerSwitcherSheet } from '@/components/LedgerSwitcherSheet';
import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { showAlert } from '@/lib/alert';
import { getErrorMessage } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import {
  importDrafts,
  parseCsvContent,
  parseXlsxBase64,
  type ImportParseResult,
} from '@/services/import.service';
import { useAuthStore } from '@/stores/auth.store';
import { selectMembers, useLedgerStore } from '@/stores/ledger.store';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Import'>;

export const ImportScreen = ({ navigation }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [showLedgerPicker, setShowLedgerPicker] = useState(false);
  const [recorderOverrides, setRecorderOverrides] = useState<Record<string, string>>({});

  const ledgers = useLedgerStore((state) => state.ledgers);
  const loadMembers = useLedgerStore((state) => state.loadMembers);
  const sessionUserId = useAuthStore((state) => state.session?.user.id ?? null);
  const profileNickname = useAuthStore((state) => state.profile?.nickname ?? null);

  const selectedLedger = useMemo(
    () => ledgers.find((ledger) => ledger.id === selectedLedgerId) ?? null,
    [ledgers, selectedLedgerId],
  );
  const familyId = selectedLedger?.type === 'family' ? selectedLedger.familyId : null;
  const members = useLedgerStore((state) => selectMembers(state, familyId ?? ''));

  useFocusEffect(
    useCallback(() => {
      setFileName(null);
      setPreview(null);
      setRecorderOverrides({});
    }, []),
  );

  useEffect(() => {
    if (!familyId) return;
    void loadMembers(familyId).catch(() => undefined);
  }, [familyId, loadMembers]);

  const pickFile = async () => {
    if (!selectedLedger) {
      showAlert('提示', '请先选择导入账本');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/comma-separated-values',
        'text/plain',
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    const isXlsx = /\.(xlsx|xls)$/i.test(asset.name ?? asset.uri);

    try {
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: isXlsx ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
      });
      const parsed = isXlsx ? parseXlsxBase64(content) : parseCsvContent(content);
      setFileName(asset.name ?? '未命名文件');
      setPreview(parsed);
      setRecorderOverrides({});
    } catch (error) {
      showAlert('读取失败', getErrorMessage(error));
    }
  };

  const currentNickname = profileNickname ?? '我';
  const recorderOptions = useMemo<RecorderOption[]>(() => {
    const options: RecorderOption[] = [];
    if (sessionUserId) {
      options.push({
        userId: sessionUserId,
        nickname: currentNickname,
        label: currentNickname === '我' ? '我' : `${currentNickname}（我）`,
      });
    }
    if (selectedLedger?.type === 'family') {
      for (const member of members) {
        if (member.userId === sessionUserId) continue;
        options.push({ userId: member.userId, nickname: member.nickname, label: member.nickname });
      }
    }
    return options;
  }, [sessionUserId, currentNickname, selectedLedger?.type, members]);

  const recorderNames = useMemo(() => {
    const names = new Set<string>();
    for (const draft of preview?.drafts ?? []) {
      const name = draft.recorderName.trim();
      if (name) names.add(name);
    }
    return [...names];
  }, [preview]);

  const recorderMapping = useMemo(() => {
    const mapping: Record<string, string> = {};
    if (!sessionUserId) return mapping;
    const ownNickname = recorderOptions.find((option) => option.userId === sessionUserId)?.nickname;
    for (const name of recorderNames) {
      const override = recorderOverrides[name];
      if (override) {
        mapping[name] = override;
        continue;
      }
      const matched = recorderOptions.find(
        (option) => option.userId !== sessionUserId && option.nickname === name,
      );
      mapping[name] =
        name === '我' || (ownNickname !== undefined && name === ownNickname)
          ? sessionUserId
          : (matched?.userId ?? sessionUserId);
    }
    return mapping;
  }, [sessionUserId, recorderOptions, recorderNames, recorderOverrides]);

  const allRecordersMapped =
    recorderNames.length === 0 || recorderNames.every((name) => Boolean(recorderMapping[name]));

  const recorderLabelOf = useCallback(
    (recorderName: string): string =>
      recorderOptions.find((option) => option.userId === recorderMapping[recorderName])?.label ??
      '当前用户',
    [recorderMapping, recorderOptions],
  );

  const handleSelectLedger = (ledgerId: string) => {
    setSelectedLedgerId(ledgerId);
    setRecorderOverrides({});
  };

  const handleImport = async () => {
    if (!selectedLedger || !preview || preview.drafts.length === 0 || !sessionUserId) return;
    setImporting(true);
    try {
      const count = await importDrafts(selectedLedger.id, preview.drafts, {
        defaultCreatedBy: sessionUserId,
        recorderUserIds: recorderMapping,
      });
      showAlert('导入成功', `已将 ${count} 笔账单导入到「${selectedLedger.name}」`, [
        { text: '好的', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      showAlert('导入失败', getErrorMessage(error));
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview?.drafts.length ?? 0;
  const errorCount = preview?.errors.length ?? 0;
  const importDisabled =
    !selectedLedger || !sessionUserId || validCount === 0 || !allRecordersMapped || importing;
  const importTitle = selectedLedger
    ? `确认导入到「${selectedLedger.name}」`
    : '请先选择账本';

  return (
    <View style={styles.container}>
      <AppHeader title="导入数据" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.tip}>
          支持 Excel(.xlsx) / CSV，可识别：日期、交易类型/类型、类别/分类、标签、描述/备注、金额、币种、创建者/记录人、是否报销/报销。标签可用 / 分隔多个，缺失分类和标签会在导入时自动创建。
        </Text>

        <Pressable
          style={styles.ledgerBox}
          disabled={importing}
          onPress={() => setShowLedgerPicker(true)}
        >
          <Text style={styles.ledgerLabel}>导入到账本</Text>
          <View style={styles.ledgerValueWrap}>
            <Text style={[styles.ledgerValue, selectedLedger ? null : styles.placeholder]}>
              {selectedLedger?.name ?? '请选择账本'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </View>
        </Pressable>
        {!selectedLedger ? (
          <Text style={styles.warning}>选择账本后，数据才会导入到对应账本下。</Text>
        ) : null}

        <Pressable style={styles.uploadBox} disabled={importing} onPress={() => void pickFile()}>
          <Ionicons name="cloud-upload-outline" size={40} color={colors.primary} />
          <Text style={styles.uploadText}>{fileName ?? '点击上传文件'}</Text>
        </Pressable>

        {preview ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>解析结果</Text>
            <Text style={styles.previewLine}>目标账本：{selectedLedger?.name ?? '未选择'}</Text>
            <Text style={styles.previewLine}>
              共解析 {preview.total} 行，可导入{' '}
              <Text style={styles.okText}>{validCount}</Text> 笔
              {errorCount > 0 ? (
                <>
                  ，<Text style={styles.errorText}>{errorCount}</Text> 行有误
                </>
              ) : null}
            </Text>
            {preview.errors.slice(0, 5).map((error) => (
              <Text key={error.line} style={styles.errorLine}>
                第 {error.line} 行：{error.message}
              </Text>
            ))}
          </View>
        ) : null}

        {preview && recorderNames.length > 0 ? (
          <ImportRecorderMapping
            recorderNames={recorderNames}
            mapping={recorderMapping}
            options={recorderOptions}
            onChange={(name, userId) =>
              setRecorderOverrides((current) => ({ ...current, [name]: userId }))
            }
          />
        ) : null}

        {preview && validCount > 0 ? (
          <ImportDataPreview drafts={preview.drafts} recorderLabelOf={recorderLabelOf} />
        ) : null}

        <PrimaryButton
          title={importTitle}
          onPress={() => void handleImport()}
          disabled={importDisabled}
          loading={importing}
        />
      </ScrollView>

      <LedgerSwitcherSheet
        visible={showLedgerPicker}
        onClose={() => setShowLedgerPicker(false)}
        title="选择导入账本"
        selectedId={selectedLedgerId ?? undefined}
        showActions={false}
        onSelect={(ledger) => handleSelectLedger(ledger.id)}
      />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    padding: space(4),
  },
  errorLine: {
    color: colors.danger,
    fontSize: fontSize.xs,
    marginTop: space(1),
  },
  errorText: {
    color: colors.danger,
  },
  ledgerBox: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    flexDirection: 'row',
    marginBottom: space(2),
    minHeight: 52,
    paddingHorizontal: space(4),
  },
  ledgerLabel: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
  },
  ledgerValueWrap: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  ledgerValue: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginRight: space(1),
  },
  okText: {
    color: colors.primary,
    fontWeight: '600',
  },
  placeholder: {
    color: colors.textTertiary,
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: space(4),
    padding: space(4),
  },
  previewLine: {
    color: colors.text,
    fontSize: fontSize.sm,
    marginTop: space(1),
  },
  previewTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  tip: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: space(4),
  },
  uploadBox: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: space(4),
    minHeight: 120,
    padding: space(4),
  },
  uploadText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: space(2),
  },
  warning: {
    color: colors.danger,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginBottom: space(2),
  },
}));
