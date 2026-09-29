import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
  /** 备注输入获得焦点时隐藏金额键盘 */
  onNoteFocus?: () => void;
  /** 备注输入失去焦点时恢复金额键盘 */
  onNoteBlur?: () => void;
}

/**
 * 「记一笔」的扩展字段：记账类型（边框胶囊勾选）、备注与账单图片。
 * 类型使用可横向扩展的胶囊按钮，后续新增类型只需继续加项，无需改布局。
 */
export const TransactionExtrasFields = ({
  note,
  onNoteChange,
  reimbursement,
  onReimbursementChange,
  images,
  onImagesChange,
  onNoteFocus,
  onNoteBlur,
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
        <Text style={styles.sectionLabel}>记账类型</Text>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="报销"
          accessibilityState={{ checked: reimbursement }}
          style={[styles.typeChip, reimbursement ? styles.typeChipSelected : null]}
          onPress={() => onReimbursementChange(!reimbursement)}
        >
          {reimbursement ? (
            <Ionicons name="checkmark" size={14} color={colors.white} />
          ) : null}
          <Text style={[styles.typeChipText, reimbursement ? styles.typeChipTextSelected : null]}>
            报销
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>备注</Text>
        <TextInput
          accessibilityLabel="备注"
          value={note}
          onChangeText={onNoteChange}
          onFocus={onNoteFocus}
          onBlur={onNoteBlur}
          placeholder="例如：和同事聚餐"
          placeholderTextColor={colors.textTertiary}
          maxLength={MAX_NOTE_LENGTH}
          multiline
          style={styles.noteInput}
        />
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
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: space(2),
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
  typeChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space(1),
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    color: colors.primaryDark,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  typeChipTextSelected: {
    color: colors.white,
  },
}));
