import {
  validateCategoryName,
  validateEmail,
  validateFamilyName,
  validateNickname,
  validatePassword,
} from './validation';

describe('validateEmail', () => {
  it('合法邮箱通过', () => {
    expect(validateEmail('a@b.co')).toBeNull();
    expect(validateEmail(' user.name+1@sub-domain.cn ')).toBeNull();
  });

  it('非法邮箱报错', () => {
    expect(validateEmail('abc')).toBe('请输入正确的邮箱地址');
    expect(validateEmail('a@b')).toBe('请输入正确的邮箱地址');
  });
});

describe('其余校验', () => {
  it('密码至少 6 位', () => {
    expect(validatePassword('123456')).toBeNull();
    expect(validatePassword('12345')).toBe('密码至少 6 位');
  });

  it('昵称 1-12 字符', () => {
    expect(validateNickname('小明')).toBeNull();
    expect(validateNickname('')).toBe('昵称需 1-12 个字符');
    expect(validateNickname('a'.repeat(13))).toBe('昵称需 1-12 个字符');
  });

  it('分类名 1-6 字符', () => {
    expect(validateCategoryName('餐饮')).toBeNull();
    expect(validateCategoryName('超长分类名称!!')).toBe('分类名需 1-6 个字符');
  });

  it('家庭名 1-12 字符', () => {
    expect(validateFamilyName('幸福之家')).toBeNull();
    expect(validateFamilyName('')).toBe('家庭名称需 1-12 个字符');
  });
});
