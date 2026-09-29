import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

export interface RecorderOption {
  userId: string;
  nickname: string;
  label: string;
}

interface Props {
  recorderNames: string[];
  mapping: Record<string, string>;
  options: RecorderOption[];
  onChange: (recorderName: string, userId: string) => void;
}

/** 导入时把来源账单里的「记录人」映射到 App 用户 */
export const ImportRecorderMapping = ({ recorderNames, mapping, options, onChange }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const [pickingName, setPickingName] = useState<string | null>(null);

  if (recorderNames.length === 0) return null;

  const targetLabelOf = (name: string): string =>
    options.find((option) => option.userId === mapping[name])?.label ?? '当前用户';

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>记录人映射</Text>
        <Text style={styles.hint}>
          来源账单中的记录人名称与 App 用户不一定一致，请选择导入后要记在谁名下。
        </Text>
        {recorderNames.map((name) => {
          const content = (
            <>
              <View style={styles.sourceWrap}>
                <Text style={styles.sourceName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.sourceHint}>来源</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
              <Text style={styles.targetName} numberOfLines={1}>
                {targetLabelOf(name)}
              </Text>
              {options.length > 1 ? (
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              ) : null}
            </>
          );
          return options.length > 1 ? (
            <Pressable
              key={name}
              style={styles.row}
              onPress={() => setPickingName(name)}
            >
              {content}
            </Pressable>
          ) : (
            <View key={name} style={styles.row}>
              {content}
            </View>
          );
        })}
      </View>

      <BottomSheet
        visible={pickingName !== null}
        onClose={() => setPickingName(null)}
        title="选择记录人"
      >
        {options.map((option) => {
          const active = pickingName ? mapping[pickingName] === option.userId : false;
          return (
            <Pressable
              key={option.userId}
              style={styles.option}
              onPress={() => {
                if (pickingName) onChange(pickingName, option.userId);
                setPickingName(null);
              }}
            >
              <Text style={[styles.optionText, active ? styles.active : null]}>
                {option.label}
              </Text>
              {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </>
  );
};

const useStyles = makeStyles((colors) => ({
  active: {
    color: colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: space(4),
    padding: space(4),
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginBottom: space(2),
    marginTop: space(1),
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space(3),
  },
  optionText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
  },
  sourceHint: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sourceName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  sourceWrap: {
    flex: 1,
    marginRight: space(2),
  },
  targetName: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: fontSize.sm,
    marginLeft: space(2),
    textAlign: 'right',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
}));
