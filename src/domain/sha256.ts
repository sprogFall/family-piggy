/**
 * 纯 JS SHA-256（FIPS 180-4）。
 *
 * React Native 没有内置 crypto，而安装包校验需要按块读取几十 MB 的文件流式计算，
 * 因此这里实现一个可分段喂入的增量哈希（避免把整个 APK 读成字符串或一次性进内存）。
 * 与 Node 的 `crypto.createHash('sha256')` 逐向量对齐（见 sha256.test.ts）。
 */

/** 轮常量：前 64 个质数立方根小数部分的前 32 位 */
const ROUND_CONSTANTS = Uint32Array.from([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** 初始哈希值：前 8 个质数平方根小数部分的前 32 位 */
const INITIAL_STATE = Uint32Array.from([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

const BLOCK_SIZE = 64;
/** 填充分组里留给「消息长度」的 8 字节 */
const LENGTH_SIZE = 8;

const rotateRight = (value: number, bits: number): number =>
  ((value >>> bits) | (value << (32 - bits))) >>> 0;

export interface Sha256Hasher {
  /** 追加一段字节（可重复调用，等价于一次性哈希拼接后的内容） */
  update: (bytes: Uint8Array) => void;
  /** 输出小写十六进制摘要；调用后不应再 update */
  digest: () => string;
}

export const createSha256 = (): Sha256Hasher => {
  const state = Uint32Array.from(INITIAL_STATE);
  const buffer = new Uint8Array(BLOCK_SIZE);
  const schedule = new Uint32Array(BLOCK_SIZE);
  let buffered = 0;
  let hashedBytes = 0;
  let finished: string | null = null;

  const processBlock = (block: Uint8Array, offset: number): void => {
    for (let index = 0; index < 16; index += 1) {
      const at = offset + index * 4;
      schedule[index] =
        ((block[at] << 24) | (block[at + 1] << 16) | (block[at + 2] << 8) | block[at + 3]) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const fifteen = schedule[index - 15];
      const two = schedule[index - 2];
      const s0 = rotateRight(fifteen, 7) ^ rotateRight(fifteen, 18) ^ (fifteen >>> 3);
      const s1 = rotateRight(two, 17) ^ rotateRight(two, 19) ^ (two >>> 10);
      schedule[index] = (schedule[index - 16] + s0 + schedule[index - 7] + s1) >>> 0;
    }

    let a = state[0];
    let b = state[1];
    let c = state[2];
    let d = state[3];
    let e = state[4];
    let f = state[5];
    let g = state[6];
    let h = state[7];

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + ROUND_CONSTANTS[index] + schedule[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  };

  const write = (bytes: Uint8Array): void => {
    let offset = 0;

    if (buffered > 0) {
      const take = Math.min(BLOCK_SIZE - buffered, bytes.length);
      buffer.set(bytes.subarray(0, take), buffered);
      buffered += take;
      offset = take;
      if (buffered === BLOCK_SIZE) {
        processBlock(buffer, 0);
        buffered = 0;
      }
    }

    while (offset + BLOCK_SIZE <= bytes.length) {
      processBlock(bytes, offset);
      offset += BLOCK_SIZE;
    }

    if (offset < bytes.length) {
      buffer.set(bytes.subarray(offset), 0);
      buffered = bytes.length - offset;
    }
  };

  return {
    update: (bytes) => {
      if (finished !== null || bytes.length === 0) return;
      hashedBytes += bytes.length;
      write(bytes);
    },

    digest: () => {
      if (finished !== null) return finished;

      const bitLengthHigh = Math.floor(hashedBytes / 0x20000000);
      const bitLengthLow = (hashedBytes * 8) >>> 0;
      const paddingLength =
        hashedBytes % BLOCK_SIZE < BLOCK_SIZE - LENGTH_SIZE
          ? BLOCK_SIZE - LENGTH_SIZE - (hashedBytes % BLOCK_SIZE)
          : BLOCK_SIZE * 2 - LENGTH_SIZE - (hashedBytes % BLOCK_SIZE);
      const tail = new Uint8Array(paddingLength + LENGTH_SIZE);
      tail[0] = 0x80;
      const tailView = new DataView(tail.buffer);
      tailView.setUint32(paddingLength, bitLengthHigh);
      tailView.setUint32(paddingLength + 4, bitLengthLow);
      write(tail);

      finished = Array.from(state)
        .map((word) => word.toString(16).padStart(8, '0'))
        .join('');
      return finished;
    },
  };
};

export const sha256Hex = (bytes: Uint8Array): string => {
  const hasher = createSha256();
  hasher.update(bytes);
  return hasher.digest();
};
