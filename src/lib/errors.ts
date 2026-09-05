export const getErrorMessage = (e: unknown): string =>
  e instanceof Error && e.message ? e.message : '出错了，请稍后再试';
