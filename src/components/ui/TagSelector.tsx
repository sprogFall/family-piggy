import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { Tag } from '@/types/domain';
import { createStyles, colors, fontSize, radius, space } from '@/theme';

interface Props {
  tags: Tag[];
  selectedId: string | null;
  /** 选中 / 取消选中（再点一次已选中的标签即取消） */
  onSelect: (tagId: string | null) => void;
  /** 新建标签（保存当前这笔时一并落库，下次可直接复用） */
  onCreate: (name: string) => void;
  /** 长按删除标签（由调用方二次确认） */
  onRemove: (tag: Tag) => void;
}

const MAX_TAG_LENGTH = 8;

/**
 * 记账标签选择器：展示当前收支类型下已有的标签（点击复用），
 * 也可现场新增；新标签在提交这笔账时落库，下次记账即可直接点选。
 */
export const TagSelector = ({ tags, selectedId, onSelect, onCreate, onRemove }: Props) => {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const submitDraft = () => {
    const name = draft.trim();
    if (name === '') return;
    onCreate(name);
    setDraft('');
    setAdding(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>标签</Text>
        <Text style={styles.hint}>
          {tags.length > 0 ? '点击复用，长按删除' : '新增后下次可直接复用'}
        </Text>
      </View>

      <View style={styles.chips}>
        {tags.map((tag) => {
          const selected = tag.id === selectedId;
          return (
            <Pressable
              key={tag.id}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              onPress={() => onSelect(selected ? null : tag.id)}
              onLongPress={() => onRemove(tag)}
              delayLongPress={350}
            >
              <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>
                {selected ? `#${tag.name}` : tag.name}
              </Text>
            </Pressable>
          );
        })}

        {adding ? (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              placeholder="标签名"
              placeholderTextColor={colors.textTertiary}
              maxLength={MAX_TAG_LENGTH}
              autoFocus
              returnKeyType="done"
              onChangeText={setDraft}
              onSubmitEditing={submitDraft}
              onBlur={() => {
                if (draft.trim() === '') setAdding(false);
              }}
            />
            <Pressable
              style={styles.confirm}
              accessibilityRole="button"
              accessibilityLabel="确认新增标签"
              onPress={submitDraft}
              hitSlop={6}
            >
              <Ionicons name="checkmark" size={16} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={[styles.chip, styles.addChip]} onPress={() => setAdding(true)}>
            <Ionicons name="add" size={13} color={colors.primary} />
            <Text style={styles.addText}>新标签</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = createStyles({
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
    backgroundColor: colors.bg,
    borderColor: colors.border,
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
    color: colors.textSecondary,
    fontSize: fontSize.sm,
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
  confirm: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 26,
    justifyContent: 'center',
    width: 26,
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
  input: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.sm,
    paddingVertical: 0,
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderColor: colors.primary,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space(2),
    paddingHorizontal: space(3),
    paddingVertical: space(1),
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
