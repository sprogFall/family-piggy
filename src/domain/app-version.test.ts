import {
  compareAppVersions,
  formatAppVersion,
  isNewerVersion,
  normalizeVersionTag,
  parseAppVersion,
} from './app-version';

describe('app-version', () => {
  describe('parseAppVersion', () => {
    it('接受 v 前缀与首尾空白', () => {
      expect(parseAppVersion(' v0.1.6 ')).toEqual({ major: 0, minor: 1, patch: 6, prerelease: [] });
      expect(parseAppVersion('V1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: [] });
    });

    it('缺省次版本/修订号按 0 补齐', () => {
      expect(parseAppVersion('2')).toEqual({ major: 2, minor: 0, patch: 0, prerelease: [] });
      expect(parseAppVersion('2.1')).toEqual({ major: 2, minor: 1, patch: 0, prerelease: [] });
    });

    it('解析预发布标识并忽略构建元数据', () => {
      expect(parseAppVersion('1.2.3-beta.1')).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: ['beta', '1'],
      });
      expect(parseAppVersion('1.2.3-rc.2+build.99')).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: ['rc', '2'],
      });
    });

    it('拒绝非版本串（GitHub 预发布包的 build-<run> / 提交号）', () => {
      expect(parseAppVersion('apk-main-abc1234')).toBeNull();
      expect(parseAppVersion('build-42')).toBeNull();
      expect(parseAppVersion('')).toBeNull();
      expect(parseAppVersion('1.2.3.4')).toBeNull();
      expect(parseAppVersion('v')).toBeNull();
    });
  });

  it('normalizeVersionTag 归一化为 主.次.修订[-预发布]', () => {
    expect(normalizeVersionTag('v0.1.6')).toBe('0.1.6');
    expect(normalizeVersionTag('1.2')).toBe('1.2.0');
    expect(normalizeVersionTag('1.2.3-beta.1+build')).toBe('1.2.3-beta.1');
    expect(normalizeVersionTag('apk-main-abc1234')).toBeNull();
  });

  it('formatAppVersion 与解析互为逆运算', () => {
    expect(formatAppVersion(parseAppVersion('v2.10.3-rc.1')!)).toBe('2.10.3-rc.1');
  });

  describe('compareAppVersions', () => {
    it('逐段比较数字', () => {
      expect(compareAppVersions(parseAppVersion('1.2.3')!, parseAppVersion('1.2.4')!)).toBe(-1);
      expect(compareAppVersions(parseAppVersion('1.3.0')!, parseAppVersion('1.2.9')!)).toBe(1);
      expect(compareAppVersions(parseAppVersion('0.1.6')!, parseAppVersion('v0.1.6')!)).toBe(0);
    });

    it('正式版优先级高于同号预发布版', () => {
      expect(compareAppVersions(parseAppVersion('1.0.0')!, parseAppVersion('1.0.0-beta.1')!)).toBe(1);
      expect(compareAppVersions(parseAppVersion('1.0.0-beta.1')!, parseAppVersion('1.0.0')!)).toBe(-1);
    });

    it('预发布标识按 semver 规则排序（数字 < 字母，标识少者更小）', () => {
      expect(compareAppVersions(parseAppVersion('1.0.0-beta')!, parseAppVersion('1.0.0-beta.1')!)).toBe(-1);
      expect(compareAppVersions(parseAppVersion('1.0.0-beta.2')!, parseAppVersion('1.0.0-beta.10')!)).toBe(-1);
      expect(compareAppVersions(parseAppVersion('1.0.0-2')!, parseAppVersion('1.0.0-alpha')!)).toBe(-1);
      expect(compareAppVersions(parseAppVersion('1.0.0-alpha')!, parseAppVersion('1.0.0-beta')!)).toBe(-1);
    });
  });

  describe('isNewerVersion', () => {
    it('仅当候选版本严格更新时为真', () => {
      expect(isNewerVersion('v0.1.7', '0.1.6')).toBe(true);
      expect(isNewerVersion('1.0.0', '0.9.9')).toBe(true);
      expect(isNewerVersion('0.1.6', '0.1.6')).toBe(false);
      expect(isNewerVersion('v0.1.5', '0.1.6')).toBe(false);
    });

    it('预发布包不会推给正式版用户（除非号更大）', () => {
      expect(isNewerVersion('1.0.0-beta.1', '1.0.0')).toBe(false);
      expect(isNewerVersion('1.1.0-beta.1', '1.0.0')).toBe(true);
    });

    it('任一侧无法解析时不下发更新，避免误报', () => {
      expect(isNewerVersion('apk-main-abc1234', '0.1.6')).toBe(false);
      expect(isNewerVersion('v0.2.0', 'unknown')).toBe(false);
    });
  });
});
