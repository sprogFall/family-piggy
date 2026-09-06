import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useActiveLedger } from '@/hooks/useActiveLedgerData';
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
import { colors, fontSize, radius, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Import'>;

export const ImportScreen = ({ navigation }: Props) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportParseResult | null>(null);
  const [importing, setImporting] = useState(false);

  const ledger = useActiveLedger();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);

  useFocusEffect(
    useCallback(() => {
      setFileName(null);
      setPreview(null);
    }, []),
  );

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/comma-separated-values', 'text/plain'],
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
    } catch (error) {
      showAlert('读取失败', getErrorMessage(error));
    }
  };

  const handleImport = async () => {
    if (!ledger || !preview || preview.drafts.length === 0 || !userId) return;
    setImporting(true);
    try {
      const count = await importDrafts(ledger.id, preview.drafts, userId);
      showAlert('导入成功', `共导入 ${count} 笔账单`, [
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

  return (
    <View style={styles.container}>
      <AppHeader title="导入数据" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.tip}>
          支持 Excel(.xlsx) / CSV 文件，表头依次为：日期、类型（支出/收入）、分类、金额(元)、备注。
        </Text>

        <Pressable style={styles.uploadBox} onPress={() => void pickFile()}>
          <Ionicons name="cloud-upload-outline" size={40} color={colors.primary} />
          <Text style={styles.uploadText}>{fileName ?? '点击上传文件'}</Text>
        </Pressable>

        {preview ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>解析结果</Text>
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

        <PrimaryButton
          title="导入"
          onPress={() => void handleImport()}
          disabled={validCount === 0}
          loading={importing}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
  okText: {
    color: colors.primary,
    fontWeight: '600',
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
});
