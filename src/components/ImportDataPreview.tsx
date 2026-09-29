import { Text, View } from 'react-native';

import { dayKeyOf, timeLabelOf } from '@/domain/dates';
import { splitTagNames, type CsvDraft } from '@/domain/csv';
import { formatMoney } from '@/domain/money';
import { KIND_LABEL } from '@/types/domain';
import { makeStyles, fontSize, radius, space } from '@/theme';

export const IMPORT_PREVIEW_LIMIT = 20;

interface Props {
  drafts: CsvDraft[];
  recorderLabelOf: (recorderName: string) => string;
}

/** 导入前确认：展示前 20 条解析/映射后的流水，让用户核对字段是否符合预期 */
export const ImportDataPreview = ({ drafts, recorderLabelOf }: Props) => {
  const styles = useStyles();
  const visible = drafts.slice(0, IMPORT_PREVIEW_LIMIT);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>数据确认（前 {visible.length} 条）</Text>
      <Text style={styles.hint}>
        请核对日期、类型、分类、标签、金额与记录人映射是否符合预期，确认后再导入。
      </Text>
      {visible.map((draft, index) => {
        const tagNames = splitTagNames(draft.tagName);
        return (
          <View key={`${draft.occurredAt}-${index}`} style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={styles.date}>
                {timeLabelOf(draft.occurredAt) === '00:00'
                  ? dayKeyOf(draft.occurredAt)
                  : `${dayKeyOf(draft.occurredAt)} ${timeLabelOf(draft.occurredAt)}`}
              </Text>
              <Text style={styles.kind}>{KIND_LABEL[draft.kind]}</Text>
              <Text style={styles.amount}>
                {formatMoney(draft.amountCents, draft.currency, { thousands: false })}
              </Text>
            </View>
            <Text style={styles.line} numberOfLines={1}>
              分类：{draft.categoryName}
              {tagNames.length > 0 ? `  ${tagNames.map((name) => `#${name}`).join(' ')}` : ''}
            </Text>
            {draft.note ? (
              <Text style={styles.line} numberOfLines={2}>
                备注：{draft.note}
              </Text>
            ) : null}
            {draft.recorderName ? (
              <Text style={styles.line} numberOfLines={1}>
                记录人：{draft.recorderName} → {recorderLabelOf(draft.recorderName)}
              </Text>
            ) : null}
          </View>
        );
      })}
      {drafts.length > IMPORT_PREVIEW_LIMIT ? (
        <Text style={styles.more}>
          仅展示前 {IMPORT_PREVIEW_LIMIT} 条，共 {drafts.length} 条
        </Text>
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  amount: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: space(4),
    padding: space(4),
  },
  date: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: fontSize.xs,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginBottom: space(2),
    marginTop: space(1),
  },
  item: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: space(2),
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: space(1),
  },
  kind: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginRight: space(2),
    marginLeft: space(2),
  },
  line: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  more: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginTop: space(2),
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
}));
