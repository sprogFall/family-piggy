/** 表单校验：返回错误文案，通过则返回 null */

export const validateEmail = (value: string): string | null =>
  /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(value.trim()) ? null : '请输入正确的邮箱地址';

export const validatePassword = (value: string): string | null =>
  value.length >= 6 ? null : '密码至少 6 位';

export const validateNickname = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 12 ? null : '昵称需 1-12 个字符';
};

export const validateCategoryName = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 6 ? null : '分类名需 1-6 个字符';
};

export const validateFamilyName = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 12 ? null : '家庭名称需 1-12 个字符';
};

export const validateLedgerName = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 12 ? null : '账本名称需 1-12 个字符';
};
