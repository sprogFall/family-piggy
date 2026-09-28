import { supabase } from '@/lib/supabase';
import { createQueryChain, queryError } from '@/test/supabase-mock';

import { normalizeTagName, tagService } from './tag.service';

const fromMock = supabase.from as unknown as jest.Mock;

const tagRow = {
  id: 'g1',
  ledger_id: 'l1',
  category_id: 'c1',
  name: '午饭',
  created_at: '2024-01-01T00:00:00Z',
};

describe('normalizeTagName', () => {
  it('去除首尾空格并压缩连续空白', () => {
    expect(normalizeTagName('  午饭  ')).toBe('午饭');
    expect(normalizeTagName('下午  茶')).toBe('下午 茶');
  });
});

describe('tagService', () => {
  afterEach(() => fromMock.mockReset());

  it('list 按账本过滤并映射领域对象', async () => {
    const chain = createQueryChain({ data: [tagRow], error: null });
    fromMock.mockReturnValue(chain);

    const tags = await tagService.list('l1');

    expect(fromMock).toHaveBeenCalledWith('tags');
    expect(chain.eq).toHaveBeenCalledWith('ledger_id', 'l1');
    expect(tags).toEqual([
      {
        id: 'g1',
        ledgerId: 'l1',
        categoryId: 'c1',
        name: '午饭',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);
  });

  it('ensureMany 去重归一化后按分类 upsert 幂等写入', async () => {
    const chain = createQueryChain({ data: [tagRow], error: null });
    fromMock.mockReturnValue(chain);

    const tags = await tagService.ensureMany('l1', 'c1', ['午饭', ' 午饭 ', '', '  夜宵']);

    expect(chain.upsert).toHaveBeenCalledWith(
      [
        { ledger_id: 'l1', category_id: 'c1', name: '午饭' },
        { ledger_id: 'l1', category_id: 'c1', name: '夜宵' },
      ],
      { onConflict: 'ledger_id,category_id,name' },
    );
    expect(tags[0].name).toBe('午饭');
  });

  it('ensureMany 空名称直接返回且不发起请求', async () => {
    fromMock.mockReturnValue(createQueryChain({ data: [], error: null }));
    expect(await tagService.ensureMany('l1', 'c2', ['  '])).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('ensure 返回单个标签', async () => {
    fromMock.mockReturnValue(createQueryChain({ data: [tagRow], error: null }));
    const tag = await tagService.ensure({ ledgerId: 'l1', categoryId: 'c1', name: '午饭' });
    expect(tag.id).toBe('g1');
  });

  it('ensureMany 失败时抛出友好错误', async () => {
    fromMock.mockReturnValue(createQueryChain(queryError('boom')));
    await expect(tagService.ensureMany('l1', 'c1', ['午饭'])).rejects.toThrow('保存标签失败');
  });

  it('remove 按 ID 删除', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await tagService.remove('g1');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'g1');
  });
});
