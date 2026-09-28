/**
 * 应用图标是发布构建的硬依赖：`expo prebuild` 只会照抄路径，配置引用了不存在
 * 或尺寸不合规的图，要到构建阶段才会炸。这里把「图标存在、尺寸合规、白边已扣干净、
 * 自适应图标主体不贴边」锁成回归测试。
 *
 * 只依赖 Node 内置的 fs / zlib 手解 8bit PNG（无第三方库），因此测试不引入新依赖。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const config = require('./app.config');

/** 图标尺寸约定：Expo 要求 1024×1024 */
const ICON_SIZE = 1024;
/** 自适应图标安全区：主体须落在画布中心 92% 直径的圆内（圆形遮罩直径为画布宽） */
const SAFE_RADIUS_RATIO = 0.46;
/** 判定「白边」：三通道都很亮 */
const isWhitish = (r, g, b) => r > 244 && g > 244 && b > 244;
/** 判定暖色主体（奶油卡片 / 铅笔 / 金币徽章） */
const isWarmContent = (r, g, b) => r - b > 25 && r > 180;
/** 判定深色主体（描边、铅笔尖；排除本身就偏深的绿色背景） */
const isDarkContent = (r, g, b) => Math.min(r, g, b) < 150 && !(g >= r && g >= b);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** 解开 8bit、非隔行的 PNG，返回 { width, height, pixel(x, y) => [r, g, b] } */
const decodePng = (file) => {
  const buf = fs.readFileSync(file);
  expect(buf.subarray(0, 8)).toEqual(PNG_SIGNATURE);

  let offset = 8;
  let header = null;
  const idat = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  expect(header).not.toBeNull();
  // 只支持本项目用到的形态：8bit、非隔行、RGB / RGBA
  expect({ bitDepth: header.bitDepth, interlace: header.interlace }).toEqual({ bitDepth: 8, interlace: 0 });
  expect([2, 6]).toContain(header.colorType);

  const channels = header.colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = header.width * channels;
  const pixels = Buffer.alloc(stride * header.height);

  for (let y = 0; y < header.height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? pixels[y * stride + i - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + i] : 0;
      const upLeft = y > 0 && i >= channels ? pixels[(y - 1) * stride + i - channels] : 0;
      const value =
        filter === 0
          ? line[i]
          : filter === 1
            ? line[i] + left
            : filter === 2
              ? line[i] + up
              : filter === 3
                ? line[i] + ((left + up) >> 1)
                : line[i] + paeth(left, up, upLeft);
      pixels[y * stride + i] = value & 0xff;
    }
  }

  return {
    width: header.width,
    height: header.height,
    pixel: (x, y) => {
      const i = y * stride + x * channels;
      return [pixels[i], pixels[i + 1], pixels[i + 2]];
    },
  };
};

const assetPath = (relative) => path.join(__dirname, relative.replace(/^\.\//, ''));

const readIcon = (relative) => {
  const file = assetPath(relative);
  expect(fs.existsSync(file)).toBe(true);
  return decodePng(file);
};

const eachPixel = (png, visit) => {
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const [r, g, b] = png.pixel(x, y);
      visit(x, y, r, g, b);
    }
  }
};

describe('app.config 应用图标', () => {
  it('icon 指向存在的 1024×1024 PNG', () => {
    const png = readIcon(config.expo.icon);
    expect([png.width, png.height]).toEqual([ICON_SIZE, ICON_SIZE]);
  });

  it('自适应图标配置齐备，前景为 1024×1024 PNG 且背景色合法', () => {
    const { foregroundImage, backgroundColor } = config.expo.android.adaptiveIcon;
    expect(backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);

    const png = readIcon(foregroundImage);
    expect([png.width, png.height]).toEqual([ICON_SIZE, ICON_SIZE]);
  });

  it('两张图最外圈都没有白边（白底已扣成满幅背景色）', () => {
    for (const file of [config.expo.icon, config.expo.android.adaptiveIcon.foregroundImage]) {
      const png = readIcon(file);
      const offenders = [];
      eachPixel(png, (x, y, r, g, b) => {
        const onFrame = x < 2 || y < 2 || x >= png.width - 2 || y >= png.height - 2;
        if (onFrame && isWhitish(r, g, b)) offenders.push([x, y, r, g, b]);
      });
      expect({ file, offenders: offenders.slice(0, 5) }).toEqual({ file, offenders: [] });
    }
  });

  it('自适应图标主体收在安全区内（圆形遮罩不会裁到画面主体）', () => {
    const png = readIcon(config.expo.android.adaptiveIcon.foregroundImage);
    const cx = png.width / 2;
    const cy = png.height / 2;
    const safe = png.width * SAFE_RADIUS_RATIO;
    const offenders = [];
    eachPixel(png, (x, y, r, g, b) => {
      if (Math.hypot(x - cx, y - cy) <= safe) return;
      if (isWarmContent(r, g, b) || isDarkContent(r, g, b)) offenders.push([x, y, r, g, b]);
    });
    expect(offenders.slice(0, 5)).toEqual([]);
  });
});
