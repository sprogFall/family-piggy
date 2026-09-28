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
});
