// Dibuja el logo de ZentryDesk (monitor mostaza con la Z negra, igual que el favicon de zentrydesk.com) en PNG e ICO,
// sin librerías: rasterizado con supermuestreo 4x4 sobre el diseño de 64x64.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const out = process.argv[2] || __dirname;

const MOSTAZA = [0xE2, 0xA6, 0x0F]; const BLACK = [0x0B, 0x0B, 0x0D];
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r); const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
function inTri(x, y, a, b, c) {
  const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const d1 = s([x, y], a, b); const d2 = s([x, y], b, c); const d3 = s([x, y], c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
function distSeg(x, y, ax, ay, bx, by) {
  const dx = bx - ax; const dy = by - ay; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}
const W = 3.25; // media anchura del trazo de la Z (6.5)
function color(x, y) {
  const z = (y >= 15 - W && y <= 15 + W && x >= 21 - W && x <= 43 + W) || (y >= 38 - W && y <= 38 + W && x >= 21 - W && x <= 43 + W) || distSeg(x, y, 43, 15, 21, 38) <= W;
  if (z) return BLACK;
  // Pantalla (5,6)-(59,47) con radio 9 y pie del monitor: trapecio (25,47)-(39,47)-(42,57)-(22,57).
  if (inRoundRect(x, y, 5, 6, 59, 47, 9) || inTri(x, y, [25, 46], [39, 46], [42, 57]) || inTri(x, y, [25, 46], [42, 57], [22, 57])) return MOSTAZA;
  return null;
}
function render(size) {
  const px = Buffer.alloc(size * size * 4); const S = 4;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let r = 0; let g = 0; let b = 0; let a = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const c = color(((i + (sx + 0.5) / S) / size) * 64, ((j + (sy + 0.5) / S) / size) * 64);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
    }
    const o = (j * size + i) * 4;
    if (a) { px[o] = Math.round(r / a); px[o + 1] = Math.round(g / a); px[o + 2] = Math.round(b / a); }
    px[o + 3] = Math.round((a / (S * S)) * 255);
  }
  return px;
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xFFFFFFFF; for (const x of buf) c = crcTable[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size) {
  const px = render(size); const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// ICO con imágenes BMP (32 bits) para tamaños chicos y PNG para 256: lo que mejor aceptan rc.exe y LoadImage.
function bmpEntry(size) {
  const px = render(size); const hdr = Buffer.alloc(40);
  hdr.writeUInt32LE(40, 0); hdr.writeInt32LE(size, 4); hdr.writeInt32LE(size * 2, 8); hdr.writeUInt16LE(1, 12); hdr.writeUInt16LE(32, 14);
  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const s = (y * size + x) * 4; const d = ((size - 1 - y) * size + x) * 4;
    xor[d] = px[s + 2]; xor[d + 1] = px[s + 1]; xor[d + 2] = px[s]; xor[d + 3] = px[s + 3];
  }
  const andRow = Math.ceil(size / 32) * 4;
  return Buffer.concat([hdr, xor, Buffer.alloc(andRow * size)]);
}
function ico(sizes) {
  const imgs = sizes.map((s) => (s >= 256 ? png(256) : bmpEntry(s)));
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  const dir = Buffer.alloc(16 * sizes.length); let off = 6 + dir.length;
  sizes.forEach((s, i) => {
    const e = i * 16; dir[e] = s >= 256 ? 0 : s; dir[e + 1] = s >= 256 ? 0 : s; dir.writeUInt16LE(1, e + 4); dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(imgs[i].length, e + 8); dir.writeUInt32LE(off, e + 12); off += imgs[i].length;
  });
  return Buffer.concat([head, dir, ...imgs]);
}
fs.mkdirSync(out, { recursive: true });
const w = (n, b) => fs.writeFileSync(path.join(out, n), b);
w('icon.ico', ico([16, 24, 32, 48, 64, 128, 256]));
w('tray-icon.ico', ico([16, 24, 32, 48]));
w('app_icon.ico', ico([16, 24, 32, 48, 64, 256]));
w('icon.png', png(1024)); w('32x32.png', png(32)); w('64x64.png', png(64)); w('128x128.png', png(128)); w('128x128@2x.png', png(256));
console.log('íconos generados en', out);
