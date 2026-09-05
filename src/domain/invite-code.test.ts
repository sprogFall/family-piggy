import { isValidInviteCode, normalizeInviteCode } from './invite-code';

describe('invite-code', () => {
  it('归一化：去空格/横线并转大写', () => {
    expect(normalizeInviteCode(' ab-cd 23ef ')).toBe('ABCD23EF');
  });

  it('校验 8 位合法字符', () => {
    expect(isValidInviteCode('ABCD23EF')).toBe(true);
    expect(isValidInviteCode('abcd23ef')).toBe(true);
  });

  it('拒绝错误长度与易混淆字符', () => {
    expect(isValidInviteCode('ABCD23E')).toBe(false);
    expect(isValidInviteCode('ABCD23EF2')).toBe(false);
    expect(isValidInviteCode('IABC23EF')).toBe(false);
    expect(isValidInviteCode('OABC23EF')).toBe(false);
    expect(isValidInviteCode('0ABC23EF')).toBe(false);
    expect(isValidInviteCode('1ABC23EF')).toBe(false);
  });
});
