import { Text, View } from 'react-native';

import type { AxisLabelLayout } from '@/domain/trendAxis';
import { makeStyles, fontSize, space } from '@/theme';

const LABEL_ROTATION = '-45deg';

interface Props {
  /** 横轴区域高度,由 trendAxisLayout 给出 */
  height: number;
  labels: AxisLabelLayout[];
  /** 标签 key 前缀,保证同一页面多个图表的 React key 不冲突 */
  keyPrefix?: string;
}

/**
 * 通用横轴:负责渲染 -45° 旋转的刻度标签。
 * 刻度与定位由 domain/trendAxis 计算,组件只做展示,可被任何折线 / 柱状图复用。
 */
export const TrendXAxis = ({ height, labels, keyPrefix = '' }: Props) => {
  const styles = useStyles();
  return (
    <View style={[styles.xAxis, { height }]}>
      {labels.map((label) => (
        <Text
          key={`${keyPrefix}${label.index}`}
          style={[
            styles.xLabel,
            { left: label.left, top: label.top, width: label.width, transform: [{ rotate: LABEL_ROTATION }] },
          ]}
          numberOfLines={1}
        >
          {label.text}
        </Text>
      ))}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  xAxis: {
    marginTop: space(1),
    position: 'relative',
  },
  xLabel: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    position: 'absolute',
    textAlign: 'right',
  },
}));
