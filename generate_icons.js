/* generate_icons.js — 无第三方依赖，使用 zlib + Buffer 生成 PNG 图标 */

'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'icons');
const SIZES = [16, 32, 48, 128];

// 设计色
const BG = [0x33, 0x9a, 0xf0];       // #339af0 蓝色
const LETTER = [0xff, 0xff, 0xff];    // 白色 F
const SHADOW = [0x22, 0x7b, 0xc7];    // 稍深蓝色用于阴影

// ── CRC-32 (PNG 标准) ────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG 构造 ─────────────────────────────────────
function makeChunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const lenB = Buffer.alloc(4);
  lenB.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeB, data]);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenB, typeB, data, crcB]);
}

function createPNG(width, height, getPixel) {
  const stride = width * 4;
  const raw = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const off = y * stride + x * 4;
      raw[off]     = Math.max(0, Math.min(255, r | 0));
      raw[off + 1] = Math.max(0, Math.min(255, g | 0));
      raw[off + 2] = Math.max(0, Math.min(255, b | 0));
      raw[off + 3] = Math.max(0, Math.min(255, a | 0));
    }
  }

  // PNG filter: filter byte (None=0) per row + raw data
  const filtered = Buffer.alloc(height + height * stride);
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0;
    raw.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(filtered, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── 像素设计 ──────────────────────────────────────
// 圆角矩形 + 白色 "F" 字母
function getPixel(x, y, w, h) {
  const r = Math.max(2, w * 0.22); // 圆角半径
  const cx = w / 2;
  const cy = h / 2;
  const hw = w / 2;
  const hh = h / 2;

  // 内边距
  const pad = Math.max(1, w * 0.06);

  // 判断是否在圆角矩形内
  const ix = x - cx + hw;
  const iy = y - cy + hh;

  let inside = false;
  if (ix >= r && ix <= w - 1 - r && iy >= pad && iy <= h - 1 - pad) {
    inside = true;
  } else if (iy >= r && iy <= h - 1 - r && ix >= pad && ix <= w - 1 - pad) {
    inside = true;
  } else {
    // 圆角区域
    const corners = [
      [r, r],
      [w - 1 - r, r],
      [r, h - 1 - r],
      [w - 1 - r, h - 1 - r],
    ];
    for (const [cxi, cyi] of corners) {
      const dx = ix - cxi;
      const dy = iy - cyi;
      if (dx * dx + dy * dy <= r * r) {
        inside = true;
        break;
      }
    }
  }

  if (!inside) return [0, 0, 0, 0]; // 透明

  // 画 "F"
  // 按百分比定义区域
  const px = x / w;
  const py = y / h;

  // F 竖线：左 30%~45%，从 10% 到 85%
  const vertical   = px >= 0.30 && px <= 0.45 && py >= 0.10 && py <= 0.85;
  // F 上横线：竖线顶部往右，从 30%~82%，10%~22%
  const topBar     = py >= 0.10 && py <= 0.22 && px >= 0.30 && px <= 0.82;
  // F 中横线：竖线中部往右，从 30%~72%，45%~55%
  const midBar     = py >= 0.45 && py <= 0.55 && px >= 0.30 && px <= 0.72;

  // 描边效果：在 F 边缘加阴影色（仅大尺寸）
  const isStroke = false; // 暂时关闭

  if (vertical || topBar || midBar) {
    if (isStroke) return [...SHADOW, 255];
    return [...LETTER, 255];
  }

  // 背景用渐变色（从上到下微渐变）
  const grad = 1 - (y / h) * 0.15;
  return [
    Math.min(255, BG[0] * grad + SHADOW[0] * (1 - grad)),
    Math.min(255, BG[1] * grad + SHADOW[1] * (1 - grad)),
    Math.min(255, BG[2] * grad + SHADOW[2] * (1 - grad)),
    255,
  ];
}

// ── 生成 ──────────────────────────────────────────
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const size of SIZES) {
    const png = createPNG(size, size, getPixel);
    const outPath = path.join(OUT_DIR, `icon${size}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`✓ 已生成 ${outPath} (${png.length} 字节)`);
  }

  console.log('\n所有图标生成完毕！');
}

main();