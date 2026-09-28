import {
  RELEASE_NOTES_MAX_LINES,
  extractApkMirrors,
  extractSha256,
  toDisplayNotes,
} from './release-notes';

const NOTES = [
  'v0.1.7：修复若干问题',
  '',
  '- 修复统计页闪退',
  '- 优化记账速度',
  '',
  'SHA256: 3f786850e387550fdab836ed7e6dc881de23001b9d0e6d4f0b6b0c4e3f0f0c1a',
  'APK-Mirror: https://gh-proxy.com/https://github.com/x/y/releases/download/v1/app.apk',
  'APK-Mirror: https://mirror.example.com/app.apk',
].join('\n');

describe('release-notes', () => {
  it('提取 SHA256（大小写不敏感，只认 64 位十六进制）', () => {
    expect(extractSha256(NOTES)).toBe('3f786850e387550fdab836ed7e6dc881de23001b9d0e6d4f0b6b0c4e3f0f0c1a');
    expect(extractSha256('sha256: ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789')).toBe(
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    );
    expect(extractSha256('SHA256: 未填写')).toBeNull();
    expect(extractSha256('')).toBeNull();
  });

  it('提取 APK 镜像地址：只接受 https、去重且按出现顺序', () => {
    expect(extractApkMirrors(NOTES)).toEqual([
      'https://gh-proxy.com/https://github.com/x/y/releases/download/v1/app.apk',
      'https://mirror.example.com/app.apk',
    ]);
    expect(extractApkMirrors('apk-mirror: http://insecure.example.com/app.apk')).toEqual([]);
    expect(
      extractApkMirrors(
        ['APK-Mirror: https://a.example.com/app.apk', 'APK-Mirror: https://a.example.com/app.apk'].join('\n'),
      ),
    ).toEqual(['https://a.example.com/app.apk']);
  });

  it('展示用正文去掉机器可读行、压缩空行并截断', () => {
    expect(toDisplayNotes(NOTES)).toBe('v0.1.7：修复若干问题\n- 修复统计页闪退\n- 优化记账速度');

    const long = Array.from({ length: 30 }, (_, i) => `第 ${i + 1} 行`).join('\n');
    const shown = toDisplayNotes(long).split('\n');
    expect(shown).toHaveLength(RELEASE_NOTES_MAX_LINES);
    expect(shown[RELEASE_NOTES_MAX_LINES - 1]).toBe('…');

    expect(toDisplayNotes('')).toBe('');
  });
});
