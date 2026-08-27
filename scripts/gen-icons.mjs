/**
 * Generate Clipwave PWA icons with no image dependencies — a brand gradient square with the
 * wave mark, encoded straight to PNG (RGBA). Run: node scripts/gen-icons.mjs
 */
import zlib from "zlib";
import { promises as fs } from "fs";
import path from "path";

const OUT = path.resolve("public/icons");

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

// Draw one icon into an RGBA buffer. `inset` is the safe-zone padding fraction (maskable).
function drawIcon(size, inset = 0) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const amp = size * 0.11 * (1 - inset);
  const stroke = Math.max(2, size * 0.055 * (1 - inset));
  const left = size * (0.16 + inset * 0.5);
  const right = size * (0.84 - inset * 0.5);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      // brand-500 #317dff → purple #a855f7
      let r = lerp(0x31, 0xa8, t);
      let g = lerp(0x7d, 0x55, t);
      let b = lerp(0xff, 0xf7, t);

      // wave: y = cx + amp*sin(...)
      if (x >= left && x <= right) {
        const phase = ((x - left) / (right - left)) * Math.PI * 3;
        const yWave = cx + amp * Math.sin(phase);
        if (Math.abs(y - yWave) < stroke / 2) {
          r = g = b = 255;
        }
      }

      const i = (y * size + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
  return buf;
}

function crc(buf) {
  // Node 22+ exposes zlib.crc32; fall back to a manual table otherwise.
  if (typeof zlib.crc32 === "function") return zlib.crc32(buf) >>> 0;
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crcv = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crcv = table[(crcv ^ buf[i]) & 0xff] ^ (crcv >>> 8);
  return (crcv ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  // Add filter byte (0) at the start of each scanline.
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const targets = [
    ["icon-192.png", 192, 0],
    ["icon-512.png", 512, 0],
    ["icon-maskable-512.png", 512, 0.18],
    ["apple-touch-icon.png", 180, 0.1],
  ];
  for (const [name, size, inset] of targets) {
    const png = encodePng(size, drawIcon(size, inset));
    await fs.writeFile(path.join(OUT, name), png);
    console.log(`wrote ${name} (${size}x${size}, ${png.length} bytes)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
