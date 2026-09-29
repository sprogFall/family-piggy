import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Tag } from '@/types/domain';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

import { PromptModal } from './PromptModal';

interface Props {
  tags: Tag[];
  selectedIds: string[];
  /** 已选分类下的标签；未选分类时不展示任何标签、也不允许新增 */
  disabled?: boolean;
  /** 选中 / 取消选中（再点一次已选中的标签即取消，支持多选） */
  onToggle: (tagId: string) => void;
  /** 新建标签（由调用方落库并选中，下次记账可直接复用） */
  onCreate: (name: string) => void;
  /** 长按删除标签（由调用方二次确认） */
  onRemove: (tag: Tag) => void;
}

/** 与 `tags.name` 的展示宽度匹配的输入上限 */
const MAX_TAG_LENGTH = 8;

/**
 * 记账标签选择器：展示**当前所选分类**下已有的标签（点击多选、长按删除），
 * 「新标签」通过**弹窗**输入。
 *
 * 未选分类时整块隐藏：标签隶属于分类，没有分类就没有归属，也不允许新增。
 *
 * 输入框刻意不内联在标签行里：标签行是 `flexWrap` 容器，Android 上把 `TextInput`
 * 放进换行容器会触发反复测量（画面闪烁）且被挤成一条缝，用弹窗既稳定又能自动聚焦。
 */
export const TagSelector = ({
  tags,
  selectedIds,
  disabled = false,
  onToggle,
  onCreate,
  onRemove,
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const [creatorVisible, setCreatorVisible] = useState(false);

  if (disabled) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>标签</Text>
        <Text style={styles.hint}>
          {tags.length > 0 ? '点击多选，长按删除' : '新增后下次可直接复用'}
        </Text>
      </View>

      <View style={styles.chips}>
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <Pressable
              key={tag.id}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              onPress={() => onToggle(tag.id)}
              onLongPress={() => onRemove(tag)}
              delayLongPress={350}
            >
              <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>
                {selected ? `#${tag.name}` : tag.name}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          style={[styles.chip, styles.addChip]}
          accessibilityRole="button"
          accessibilityLabel="新增标签"
          onPress={() => setCreatorVisible(true)}
        >
          <Ionicons name="add" size={13} color={colors.primary} />
          <Text style={styles.addText}>新标签</Text>
        </Pressable>
      </View>

      <PromptModal
        visible={creatorVisible}
        onClose={() => setCreatorVisible(false)}
        title="新建标签"
        placeholder={`标签名（最多 ${MAX_TAG_LENGTH} 个字）`}
        submitLabel="添加"
        maxLength={MAX_TAG_LENGTH}
        onSubmit={onCreate}
      />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  addChip: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
    gap: 2,
  },
  addText: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.primaryDark,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  container: {
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(2),
    marginBottom: space(2),
  },
  hint: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
}));
