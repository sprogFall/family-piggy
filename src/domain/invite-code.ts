/** 家庭邀请码：8 位大写字母数字（去除易混淆字符） */

export const INVITE_CODE_LENGTH = 8;

export const normalizeInviteCode = (input: string): string =>
  input.trim().toUpperCase().replace(/[\s-]/g, '');

export const isValidInviteCode = (input: string): boolean =>
  /^[A-HJ-NP-Z2-9]{8}$/.test(normalizeInviteCode(input));
