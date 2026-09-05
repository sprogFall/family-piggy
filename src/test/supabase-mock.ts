/**
 * Supabase 查询链测试替身：链式调用任意方法，最终 resolve 给定结果。
 */

export const queryError = (message: string) => ({ data: null, error: { message } });

export const createQueryChain = (result: unknown = { data: null, error: null }): any => {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'in',
    'gte',
    'lte',
    'lt',
    'gt',
    'order',
    'limit',
    'range',
    'single',
    'maybeSingle',
  ];
  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  chain.then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  chain.catch = (reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).catch(reject);
  return chain;
};

export const createRealtimeChannel = (): any => {
  const channel: Record<string, unknown> = {};
  channel.on = jest.fn(() => channel);
  channel.subscribe = jest.fn(() => ({ unsubscribe: jest.fn() }));
  return channel;
};
