import fs from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
await fs.mkdir(new URL('public/backgrounds/', root), { recursive: true });
await fs.mkdir(new URL('public/items/', root), { recursive: true });
for (const id of ['daydream', 'sunset', 'cloud', 'night']) {
  await sharp(fileURLToPath(new URL(`assets/shop/source/${id}.png`, root)))
    .resize({ width: 960 })
    .webp({ quality: 85 })
    .toFile(fileURLToPath(new URL(`public/backgrounds/${id}.webp`, root)));
}
for (const [file, ids] of [
  ['items', ['berry', 'tea', 'ball', 'book', 'plant', 'lamp']],
  ['items-more', ['salmon', 'pancakes', 'smoothie', 'mouse', 'cushion', 'nightlight']],
]) {
  const source = new URL(`assets/shop/source/${file}.png`, root);
  const { width, height } = await sharp(fileURLToPath(source)).metadata();
  for (const [i, id] of ids.entries()) {
    const left = Math.round(((i % 3) * width) / 3),
      top = Math.round((Math.floor(i / 3) * height) / 2);
    const right = Math.round((((i % 3) + 1) * width) / 3),
      bottom = Math.round(((Math.floor(i / 3) + 1) * height) / 2);
    const cell = await sharp(fileURLToPath(source))
      .extract({ left, top, width: right - left, height: bottom - top })
      .png()
      .toBuffer();
    await sharp(cell)
      .trim({ threshold: 12 })
      .resize({
        width: 240,
        height: 240,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ lossless: true })
      .toFile(fileURLToPath(new URL(`public/items/${id}.webp`, root)));
  }
}
console.log('Packed four backgrounds and twelve transparent collectibles.');
