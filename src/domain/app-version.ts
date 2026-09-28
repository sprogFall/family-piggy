/**
 * 应用版本号：语义化版本（主.次.修订[-预发布][+构建]）的解析与比较。
 *
 * 用于「检查更新」判断 GitHub Release 的 tag 是否比当前安装的版本更新。
 * 预发布包（CI 手动触发的 `build-<run>` 走预发布通道）在无法解析出版本号时
 * 一律视为「不更新」，避免给正式版用户误报。
 */

export interface AppVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  /** 预发布标识：`1.2.3-beta.1` → `['beta','1']`；正式版为空数组 */
  readonly prerelease: readonly string[];
}

/** 主版本必填，次版本/修订号可省略；构建元数据（`+xxx`）解析后丢弃 */
const VERSION_PATTERN = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

const NUMERIC_PART = /^\d+$/;

export const parseAppVersion = (raw: string): AppVersion | null => {
  const matched = VERSION_PATTERN.exec(raw.trim().replace(/^[vV]/, ''));
  if (matched === null) return null;

  return {
    major: Number(matched[1]),
    minor: Number(matched[2] ?? 0),
    patch: Number(matched[3] ?? 0),
    prerelease: (matched[4] ?? '').split('.').filter((part) => part.length > 0),
  };
};

export const formatAppVersion = (version: AppVersion): string => {
  const core = `${version.major}.${version.minor}.${version.patch}`;
  return version.prerelease.length > 0 ? `${core}-${version.prerelease.join('.')}` : core;
};

/** 归一化为 `主.次.修订[-预发布]`；非版本串（如 `apk-main-abc1234`）返回 null */
export const normalizeVersionTag = (raw: string): string | null => {
  const parsed = parseAppVersion(raw);
  return parsed === null ? null : formatAppVersion(parsed);
};

/** 比较预发布标识：数字标识优先级低于字母标识，标识少者更小（semver 规则） */
const comparePrereleaseIdentifier = (a: string, b: string): number => {
  if (a === b) return 0;
  const aNumeric = NUMERIC_PART.test(a);
  const bNumeric = NUMERIC_PART.test(b);
  if (aNumeric && bNumeric) return Number(a) > Number(b) ? 1 : -1;
  if (aNumeric) return -1;
  if (bNumeric) return 1;
  return a > b ? 1 : -1;
};

export const compareAppVersions = (a: AppVersion, b: AppVersion): number => {
  const cores: Array<[number, number]> = [
    [a.major, b.major],
    [a.minor, b.minor],
    [a.patch, b.patch],
  ];
  for (const [left, right] of cores) {
    if (left !== right) return left > right ? 1 : -1;
  }

  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;

  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const left = a.prerelease[index];
    const right = b.prerelease[index];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const diff = comparePrereleaseIdentifier(left, right);
    if (diff !== 0) return diff;
  }

  return 0;
};

/** 候选版本是否严格更新；任一侧解析失败时返回 false */
export const isNewerVersion = (candidate: string, current: string): boolean => {
  const next = parseAppVersion(candidate);
  const installed = parseAppVersion(current);
  if (next === null || installed === null) return false;
  return compareAppVersions(next, installed) > 0;
};
