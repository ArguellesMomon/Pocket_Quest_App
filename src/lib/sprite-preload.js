import { SELECTABLE_COMPANIONS } from '../../shared/companions.js';
const images = new Map();
export function preloadCompanion(species) {
  const companion = SELECTABLE_COMPANIONS.find((c) => c.id === species);
  if (!companion) return;
  for (const sheet of [companion.sheet, ...(species === 'chami' ? ['chami-idle.webp'] : [])]) {
    if (images.has(sheet)) continue;
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    image.src = `/companions/${sheet}`;
    images.set(sheet, image);
    image.decode().catch(() => {});
  }
}
export function preloadCompanions() {
  for (const companion of SELECTABLE_COMPANIONS) preloadCompanion(companion.id);
}
