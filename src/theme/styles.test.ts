import { setActiveFontScale } from './font-scale';
import { createStyles } from './index';

const shared = { fontSize: 13 };

const styles = createStyles({
  accent: { color: '#000000', fontSize: 20, fontWeight: '600' },
  lineHeightBox: { fontSize: 15, lineHeight: 24 },
  sharedA: shared,
  sharedB: shared,
  spacing: { padding: 16 },
});

describe('createStyles', () => {
  afterEach(() => setActiveFontScale('standard'));

  it('fontSize / lineHeight 随档位缩放，其余属性不受影响', () => {
    setActiveFontScale('standard');
    expect(styles.accent.fontSize).toBe(20);
    expect(styles.lineHeightBox.fontSize).toBe(15);
    expect(styles.lineHeightBox.lineHeight).toBe(24);
    expect(styles.accent.color).toBe('#000000');
    expect(styles.accent.fontWeight).toBe('600');
    expect(styles.spacing.padding).toBe(16);

    setActiveFontScale('xlarge');
    expect(styles.lineHeightBox.fontSize).toBe(20); // 15 * 1.3 = 19.5 → 20
    expect(styles.lineHeightBox.lineHeight).toBe(31); // 24 * 1.3 = 31.2 → 31
    expect(styles.accent.fontSize).toBe(26);

    setActiveFontScale('small');
    expect(styles.accent.fontSize).toBe(18); // 20 * 0.9
    expect(styles.spacing.padding).toBe(16);
  });

  it('重复引用同一份样式对象不会叠加缩放', () => {
    setActiveFontScale('xlarge');
    expect(styles.sharedA.fontSize).toBe(17); // 13 * 1.3
    expect(styles.sharedB.fontSize).toBe(17);
  });

  it('同一档位下多次读取返回同一引用，切换档位后引用必然变化', () => {
    setActiveFontScale('standard');
    const accentAtStandard = styles.accent;
    const sharedAtStandard = styles.sharedA;
    expect(styles.accent).toBe(accentAtStandard);
    // 同一份原始样式对象被多处复用时应共享同一份物化对象
    expect(styles.sharedB).toBe(sharedAtStandard);

    // RN（Fabric）diff 依赖 props 引用变化，切换档位必须产生新引用
    setActiveFontScale('xlarge');
    const accentAtXlarge = styles.accent;
    expect(accentAtXlarge).not.toBe(accentAtStandard);
    expect(styles.accent).toBe(accentAtXlarge);
    expect(styles.accent.fontSize).toBe(26);

    // 切回原档位复用缓存引用，且不会在已物化对象上重复缩放
    setActiveFontScale('standard');
    expect(styles.accent).toBe(accentAtStandard);
    expect(styles.accent.fontSize).toBe(20);
    setActiveFontScale('xlarge');
    expect(styles.accent).toBe(accentAtXlarge);
    expect(styles.accent.fontSize).toBe(26);
  });

  it('物化对象是普通可枚举属性的 plain object，getter 只留在最外层容器上', () => {
    setActiveFontScale('large');
    const accent = styles.accent;

    // 最外层容器属性是 getter（读取时才按当前档位物化）
    expect(Object.getOwnPropertyDescriptor(styles, 'accent')?.get).toEqual(expect.any(Function));

    // 物化对象自身不含任何 getter，属性均可枚举，才能被 RN 正常序列化下发原生
    const fontSizeDescriptor = Object.getOwnPropertyDescriptor(accent, 'fontSize');
    expect(fontSizeDescriptor?.get).toBeUndefined();
    expect(fontSizeDescriptor?.enumerable).toBe(true);
    expect(Object.keys(accent)).toEqual(['color', 'fontSize', 'fontWeight']);

    // 其余属性原样透传
    expect(accent.color).toBe('#000000');
    expect(accent.fontWeight).toBe('600');
  });

  it('lineHeight 同样按档位物化，且新引用随档位变化', () => {
    setActiveFontScale('standard');
    const boxAtStandard = styles.lineHeightBox;
    expect(boxAtStandard.fontSize).toBe(15);
    expect(boxAtStandard.lineHeight).toBe(24);

    setActiveFontScale('small');
    const boxAtSmall = styles.lineHeightBox;
    expect(boxAtSmall).not.toBe(boxAtStandard);
    expect(boxAtSmall.fontSize).toBe(14); // 15 * 0.9 = 13.5 → 14
    expect(boxAtSmall.lineHeight).toBe(22); // 24 * 0.9 = 21.6 → 22

    setActiveFontScale('xlarge');
    const boxAtXlarge = styles.lineHeightBox;
    expect(boxAtXlarge).not.toBe(boxAtSmall);
    expect(boxAtXlarge.lineHeight).toBe(31); // 24 * 1.3 = 31.2 → 31
    expect(styles.lineHeightBox).toBe(boxAtXlarge);
  });
});
