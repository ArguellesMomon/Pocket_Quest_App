import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/companions', { recursive: true });
const report = {};
for (const name of ['mochi', 'nori', 'pip', 'maple']) {
  const source = `assets/companions/source/${name}.png`;
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  if (width / height !== 2 / 3) throw new Error(`${name}: expected a 4 × 6 square-cell sheet.`);
  const visited = new Uint8Array(width * height),
    components = [],
    queue = new Int32Array(width * height);
  // Detect connected silhouettes rather than slicing through a generated paw or ear.
  for (let seed = 0; seed < visited.length; seed++) {
    if (visited[seed] || data[seed * 4 + 3] < 100) continue;
    let start = 0,
      end = 1,
      minX = width,
      minY = height,
      maxX = 0,
      maxY = 0,
      count = 0;
    queue[0] = seed;
    visited[seed] = 1;
    while (start < end) {
      const pixel = queue[start++],
        x = pixel % width,
        y = Math.floor(pixel / width);
      count++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (const neighbor of [
        x > 0 ? pixel - 1 : -1,
        x < width - 1 ? pixel + 1 : -1,
        y > 0 ? pixel - width : -1,
        y < height - 1 ? pixel + width : -1,
      ]) {
        if (neighbor >= 0 && !visited[neighbor] && data[neighbor * 4 + 3] >= 100) {
          visited[neighbor] = 1;
          queue[end++] = neighbor;
        }
      }
    }
    if (count > 1000) components.push({ minX, minY, maxX, maxY, count });
  }
  const cells = new Map();
  for (const c of components) {
    const column = Math.min(3, Math.floor((c.minX + c.maxX) / 2 / (width / 4)));
    const row = Math.min(5, Math.floor((c.minY + c.maxY) / 2 / (height / 6)));
    const key = row * 4 + column;
    if (!cells.has(key) || c.count > cells.get(key).count) cells.set(key, c);
  }
  if (cells.size !== 24)
    throw new Error(`${name}: found ${cells.size}/24 silhouettes; inspect the source sheet.`);
  const frame = 192,
    padding = 12;
  const largest = Math.max(
    ...[...cells.values()].map((c) => Math.max(c.maxX - c.minX + 13, c.maxY - c.minY + 13)),
  );
  const scale = (frame - padding * 2) / largest,
    layers = [];
  const bounds = [];
  for (let index = 0; index < 24; index++) {
    const c = cells.get(index);
    const left = Math.max(0, c.minX - 6),
      top = Math.max(0, c.minY - 6);
    const cropWidth = Math.min(width - left, c.maxX + 7 - left),
      cropHeight = Math.min(height - top, c.maxY + 7 - top);
    const outputWidth = Math.max(1, Math.round(cropWidth * scale)),
      outputHeight = Math.max(1, Math.round(cropHeight * scale));
    const buffer = await sharp(source)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize(outputWidth, outputHeight, { kernel: 'nearest' })
      .png()
      .toBuffer();
    layers.push({
      input: buffer,
      left: (index % 4) * frame + Math.round((frame - outputWidth) / 2),
      top: Math.floor(index / 4) * frame + frame - padding - outputHeight,
    });
    bounds.push({ index, left, top, width: cropWidth, height: cropHeight });
  }
  await sharp({
    create: { width: frame * 4, height: frame * 6, channels: 4, background: '#00000000' },
  })
    .composite(layers)
    .webp({ lossless: true })
    .toFile(`public/companions/${name}.webp`);
  report[name] = {
    source,
    inputSize: [width, height],
    grid: [4, 6],
    cell: [frame, frame],
    frames: bounds,
    transparent: true,
  };
  console.log(`${name}: 24 aligned frames, transparent WebP atlas.`);
}
await writeFile('assets/companions/atlas-manifest.json', JSON.stringify(report, null, 2));
