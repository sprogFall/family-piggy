/**
 * Release 说明解析：CI 会把机器可读的信息追加进 Release 正文，
 * App 端据此拿到安装包校验和与镜像地址，展示时再把它们去掉。
 *
 * 约定（见 .github/workflows/release.yml）：
 *   SHA256: <64 位十六进制>
 *   APK-Mirror: https://<镜像地址>
 */

export const RELEASE_NOTES_MAX_LINES = 12;

const SHA256_LINE = /^\s*sha256\s*[:：]\s*([0-9a-fA-F]{64})\s*$/i;
const MIRROR_LINE = /^\s*apk-mirror\s*[:：]\s*(\S+)\s*$/i;

/** 安装包 SHA-256（小写十六进制）；说明里没有或格式不对时返回 null */
export const extractSha256 = (notes: string): string | null => {
  for (const line of notes.split('\n')) {
    const matched = SHA256_LINE.exec(line);
    if (matched !== null) return matched[1].toLowerCase();
  }
  return null;
};

/** 说明里声明的下载镜像（仅接受 https，去重、保持出现顺序） */
export const extractApkMirrors = (notes: string): string[] => {
  const mirrors: string[] = [];
  for (const line of notes.split('\n')) {
    const matched = MIRROR_LINE.exec(line);
    if (matched === null) continue;
    let url: URL;
    try {
      url = new URL(matched[1]);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:') continue;
    const normalized = url.toString();
    if (!mirrors.includes(normalized)) mirrors.push(normalized);
  }
  return mirrors;
};

/** 展示用正文：去掉机器可读行与空行，超长时截断并补省略号 */
export const toDisplayNotes = (notes: string): string => {
  const lines = notes
    .split('\n')
    .filter((line) => SHA256_LINE.test(line) === false && MIRROR_LINE.test(line) === false)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length <= RELEASE_NOTES_MAX_LINES) return lines.join('\n');
  return [...lines.slice(0, RELEASE_NOTES_MAX_LINES - 1), '…'].join('\n');
};
