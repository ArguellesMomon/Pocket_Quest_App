// Existing species IDs remain valid so saved adventures keep their companion.
export const COMPANIONS = [
  {
    id: 'cat',
    name: 'Mochi',
    type: 'Cat',
    color: '#f2d4af',
    sheet: 'mochi.webp',
    columns: 4,
    rows: 6,
  },
  {
    id: 'nori',
    name: 'Nori',
    type: 'Cat',
    color: '#bdb8d2',
    sheet: 'nori.webp',
    columns: 4,
    rows: 6,
  },
  { id: 'pip', name: 'Pip', type: 'Dog', color: '#e9c094', sheet: 'pip.webp', columns: 4, rows: 6 },
  {
    id: 'maple',
    name: 'Maple',
    type: 'Dog',
    color: '#bc917a',
    sheet: 'maple.webp',
    columns: 4,
    rows: 6,
  },
  {
    id: 'samo',
    name: 'Samo',
    type: 'Dog',
    color: '#dde2d5',
    sheet: 'samo.webp',
    columns: 8,
    rows: 9,
  },
  { id: 'fox', name: 'Ember', type: 'Fox', color: '#d79b6f', legacy: true },
  { id: 'bunny', name: 'Clover', type: 'Rabbit', color: '#dfccdd', legacy: true },
];
export const SELECTABLE_COMPANIONS = COMPANIONS.filter((c) => !c.legacy);
export const MOODS = {
  idle: { label: 'Cozy', icon: 'paw', row: 0, frames: [0, 0, 0, 1, 0, 2, 3, 0], speed: 440 },
  happy: { label: 'Happy', icon: 'heart', row: 1, frames: [0, 1, 2, 3, 0, 1], speed: 430 },
  sleepy: { label: 'Sleepy', icon: 'moon', row: 2, frames: [0, 1, 2, 3, 2, 1], speed: 700 },
  playful: { label: 'Playful', icon: 'sparkles', row: 3, frames: [0, 1, 2, 3, 2, 0], speed: 250 },
  hungry: { label: 'Hungry', icon: 'utensils', row: 4, frames: [0, 1, 2, 3, 0, 3], speed: 650 },
  lonely: { label: 'Needs company', icon: 'heart', row: 5, frames: [0, 1, 2, 3, 0, 3], speed: 650 },
  celebrating: {
    label: 'Proud of you',
    icon: 'star',
    row: 3,
    frames: [1, 2, 3, 0, 1, 2],
    speed: 200,
  },
  eating: { label: 'Yum!', icon: 'utensils', row: 1, frames: [0, 1, 3, 1, 2, 0], speed: 260 },
  curious: { label: 'Hello!', icon: 'sparkles', row: 0, frames: [2, 0, 3, 1, 2, 0], speed: 330 },
  walking: { label: 'Exploring', icon: 'paw', row: 1, frames: [0, 2, 3, 2], speed: 320 },
};
export function companionFor(id) {
  return COMPANIONS.find((c) => c.id === id) || COMPANIONS[0];
}
export function moodFor(state, stats, now = Date.now(), interacting = false) {
  if (interacting) return 'curious';
  const event = state.pet.lastInteraction;
  const age = event ? Math.max(0, now - event.at) : Infinity;
  if (age >= 0 && age < 6500)
    return event.kind === 'food'
      ? 'eating'
      : event.kind === 'play'
        ? 'playful'
        : event.kind === 'quest'
          ? 'celebrating'
          : 'curious';
  if (stats.energy <= 35) return 'sleepy';
  if (stats.energy <= 55) return 'hungry';
  if (stats.joy <= 45) return 'lonely';
  if (stats.joy >= 85 && stats.energy >= 65) return 'happy';
  return 'idle';
}
export function frameFor(companion, mood, elapsed = 0, moving = true) {
  const definition = MOODS[mood] || MOODS.idle;
  const position = moving ? Math.floor(elapsed / definition.speed) % definition.frames.length : 0;
  if (companion.id !== 'samo') return { row: definition.row, column: definition.frames[position] };
  const original = {
    idle: { row: 0, frames: [0, 0, 1, 2, 3, 4, 5, 0] },
    happy: { row: 0, frames: [0, 2, 5, 4, 2, 0] },
    curious: { row: 0, frames: [4, 3, 0, 1, 2, 0] },
    walking: { row: 1, frames: [0, 1, 2, 3, 4, 5, 6, 7] },
    playful: { row: 4, frames: [0, 1, 2, 3, 4, 1] },
    celebrating: { row: 4, frames: [0, 1, 2, 3, 4, 0] },
    eating: { row: 8, frames: [0, 1, 2, 3, 4, 5] },
    hungry: { row: 5, frames: [0, 1, 5, 6, 7, 0] },
    sleepy: { row: 5, frames: [2, 3, 4, 3, 2, 3] },
    lonely: { row: 5, frames: [0, 1, 5, 6, 7, 0] },
  }[mood] || { row: 0, frames: [0, 1, 2, 0] };
  return { row: original.row, column: original.frames[position % original.frames.length] };
}
