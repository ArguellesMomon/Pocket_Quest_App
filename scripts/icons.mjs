import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}
await mkdir(new URL('../public/icons/', import.meta.url), { recursive: true });
for (const size of [192, 512]) {
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 20,
        v = (y / size) * 20;
      const sprout =
        (u >= 9 && u < 11 && v >= 9 && v < 15) ||
        (u >= 5 && u < 9 && v >= 7 && v < 10) ||
        (u >= 6 && u < 10 && v >= 9 && v < 11) ||
        (u >= 11 && u < 15 && v >= 5 && v < 9) ||
        (u >= 11 && u < 14 && v >= 8 && v < 10) ||
        (u >= 7 && u < 13 && v >= 15 && v < 16);
      const color = sprout ? [255, 222, 150] : [117, 80, 183];
      const i = y * (size * 4 + 1) + x * 4 + 1;
      rows[i] = color[0];
      rows[i + 1] = color[1];
      rows[i + 2] = color[2];
      rows[i + 3] = 255;
    }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  await writeFile(
    new URL(`../public/icons/icon-${size}.png`, import.meta.url),
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(rows)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
console.log('Pocket Quest PWA icons generated.');
