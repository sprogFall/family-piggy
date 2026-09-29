import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, Image, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import {
  MAX_TRANSACTION_IMAGES,
  canAddTransactionImage,
  transactionImageDraftsOf,
  type TransactionImageDraft,
} from '@/domain/transaction-images';
import { fontSize, makeStyles, radius, space, useColors } from '@/theme';

const MAX_NOTE_LENGTH = 200;

interface Props {
  note: string;
  onNoteChange: (value: string) => void;
  reimbursement: boolean;
  onReimbursementChange: (value: boolean) => void;
  images: TransactionImageDraft[];
  onImagesChange: (images: TransactionImageDraft[]) => void;
}

/**
 * 「记一笔」的扩展字段：备注（本笔独有）、记账类型（当前为是否报销）与账单图片。
 * 图片选择在组件内完成，上传由页面在提交时统一走 service，保证组件不直接访问 Supabase。
 */
export const TransactionExtrasFields = ({
  note,
  onNoteChange,
  reimbursement,
  onReimbursementChange,
  images,
  onImagesChange,
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const canAddImage = canAddTransactionImage(images.length);

  const pickImages = async () => {
    if (!canAddImage) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_TRANSACTION_IMAGES - images.length,
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;

    const remaining = MAX_TRANSACTION_IMAGES - images.length;
    const picked = result.assets.slice(0, remaining).map((asset, index) => ({
      id: `local-${Date.now()}-${index}`,
      uri: asset.uri,
      remote: false,
      mimeType: asset.mimeType ?? 'image/jpeg',
    }));
    onImagesChange([...images, ...picked].slice(0, MAX_TRANSACTION_IMAGES));
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter((image) => image.id !== id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>备注</Text>
          <Text style={styles.hint}>仅属于本笔，不会复用</Text>
        </View>
        <TextInput
          accessibilityLabel="备注"
          value={note}
          onChangeText={onNoteChange}
          placeholder="例如：和同事聚餐"
          placeholderTextColor={colors.textTertiary}
          maxLength={MAX_NOTE_LENGTH}
          multiline
          style={styles.noteInput}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>记账类型</Text>
          <Text style={styles.hint}>后续可继续扩展</Text>
        </View>
        <View style={styles.typeRow}>
          <Text style={styles.typeLabel}>是否报销</Text>
          <Switch
            accessibilityLabel="是否报销"
            value={reimbursement}
            onValueChange={onReimbursementChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>图片</Text>
          <Text style={styles.hint}>最多 {MAX_TRANSACTION_IMAGES} 张</Text>
        </View>
        <View style={styles.imageGrid}>
          {images.map((image, index) => (
            <View key={image.id} style={styles.thumbWrap}>
              <Image source={{ uri: image.uri }} style={styles.thumb} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`删除图片 ${index + 1}`}
                hitSlop={8}
                style={styles.removeBadge}
                onPress={() => removeImage(image.id)}
              >
                <Ionicons name="close" size={13} color={colors.white} />
              </Pressable>
            </View>
          ))}

          {canAddImage ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="添加图片"
              style={styles.addTile}
              onPress={() => void pickImages()}
            >
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
              <Text style={styles.addTileText}>添加</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};

/** 从已有远程 URL 初始化编辑草稿 */
export const initialTransactionImageDrafts = (urls: string[]): TransactionImageDraft[] =>
  transactionImageDraftsOf(urls);

const useStyles = makeStyles((colors) => ({
  addTile: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  addTileText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  container: {
    paddingBottom: space(2),
  },
  hint: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(2),
    marginBottom: space(2),
  },
  noteInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: fontSize.md,
    minHeight: 76,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    textAlignVertical: 'top',
  },
  removeBadge: {
    alignItems: 'center',
    backgroundColor: colors.textSecondary,
    borderRadius: radius.round,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: -6,
    top: -6,
    width: 20,
  },
  section: {
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  thumb: {
    borderRadius: radius.md,
    height: 68,
    width: 68,
  },
  thumbWrap: {
    height: 68,
    width: 68,
  },
  typeLabel: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  typeRow: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: space(3),
    justifyContent: 'space-between',
  },
}));
