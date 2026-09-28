import { createSha256, sha256Hex } from './sha256';

const bytesOf = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'utf8'));

describe('sha256', () => {
  it('匹配标准测试向量', () => {
    expect(sha256Hex(bytesOf(''))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256Hex(bytesOf('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(
      sha256Hex(
        bytesOf('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
      ),
    ).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });

  it('百万个 a 的向量（跨多个分组）', () => {
    expect(sha256Hex(bytesOf('a'.repeat(1000000)))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
  });

  it('createSha256 分段 update 与一次性结果一致（大文件分块读取用）', () => {
    const hasher = createSha256();
    const payload = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
    for (let i = 0; i < payload.length; i += 7) {
      hasher.update(bytesOf(payload.slice(i, i + 7)));
    }
    expect(hasher.digest()).toBe(sha256Hex(bytesOf(payload)));
  });

  it('分组边界（55/56/64/65 字节）处理正确', () => {
    // 56 字节起需要额外填充分组，是最容易写错的边界
    const vectors: Record<number, string> = {
      55: '9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318',
      56: 'b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a',
      64: 'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb',
      65: '635361c48bb9eab14198e76ea8ab7f1a41685d6ad62aa9146d301d4f17eb0ae0',
    };
    for (const [length, digest] of Object.entries(vectors)) {
      expect(sha256Hex(bytesOf('a'.repeat(Number(length))))).toBe(digest);
    }
  });
});
