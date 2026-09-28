import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFontScaleSubscription } from '@/stores/settings.store';
import { useToastStore } from '@/stores/toast.store';
import { createStyles, colors, fontSize, radius, space, TABBAR_HEIGHT } from '@/theme';

/** 淡入 / 淡出时长（毫秒） */
const FADE_MS = 160;

/** 全局浮窗：挂载一次，任何屏幕调用 useToastStore.show 即可展示 */
export const Toast = () => {
  const insets = useSafeAreaInsets();
  const message = useToastStore((state) => state.message);
  // 订阅字号档位：浮窗文本随「设置 → 字体大小」缩放
  useFontScaleSubscription();
  const [shown, setShown] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message !== null) {
      setShown(message);
    }
    Animated.timing(opacity, {
      toValue: message !== null ? 1 : 0,
      duration: FADE_MS,
      // 只驱动 opacity，且 web 无原生动画模块，统一走 JS 驱动
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && message === null) setShown(null);
    });
  }, [message, opacity]);

  if (shown === null) return null;

  return (
    <Animated.View
      testID="toast"
      pointerEvents="none"
      style={[styles.wrap, { bottom: TABBAR_HEIGHT + space(6) + insets.bottom, opacity }]}
    >
      <View style={styles.bubble}>
        <Text style={styles.text}>{shown}</Text>
      </View>
    </Animated.View>
  );
};

const styles = createStyles({
  bubble: {
    backgroundColor: colors.toastBg,
    borderRadius: radius.round,
    paddingHorizontal: space(5),
    paddingVertical: space(3),
  },
  text: {
    color: colors.white,
    fontSize: fontSize.sm,
  },
  wrap: {
    alignItems: 'center',
    left: 0,
    paddingHorizontal: space(8),
    position: 'absolute',
    right: 0,
  },
});
