export const CATEGORIES = ['Work', 'Learning', 'Wellbeing', 'Home', 'Creative'];
export const DIFFICULTIES = {
  gentle: { label: 'Easy', coins: 10, xp: 15 },
  steady: { label: 'Medium', coins: 20, xp: 30 },
  bold: { label: 'Hard', coins: 35, xp: 50 },
};
import { COMPANIONS } from './companions.js';
export const SPECIES = COMPANIONS.map((c) => ({ ...c, title: c.type, description: '' }));
export const CATALOG = [
  {
    id: 'berry',
    name: 'Berry bites',
    category: 'Food',
    cost: 15,
    level: 1,
    art: 'berry',
    description: 'A sweet pick-me-up. Restores 25 energy.',
    energy: 25,
    consumable: true,
  },
  {
    id: 'tea',
    name: 'Moonmilk tea',
    category: 'Food',
    cost: 25,
    level: 1,
    art: 'tea',
    description: 'A cozy cup. Restores 35 energy and 10 joy.',
    energy: 35,
    joy: 10,
    consumable: true,
  },
  {
    id: 'ball',
    name: 'Yarn of sunshine',
    category: 'Toys',
    cost: 20,
    level: 1,
    art: 'ball',
    description: 'One very good play session. Restores 30 joy.',
    joy: 30,
    consumable: true,
  },
  {
    id: 'salmon',
    name: 'Salmon treats',
    category: 'Food',
    cost: 20,
    level: 1,
    art: 'salmon',
    description: 'Little fish-shaped treats. +30 energy, +5 joy.',
    energy: 30,
    joy: 5,
    consumable: true,
  },
  {
    id: 'pancakes',
    name: 'Sunrise pancakes',
    category: 'Food',
    cost: 35,
    level: 2,
    art: 'pancakes',
    description: 'A fluffy breakfast. +45 energy, +10 joy.',
    energy: 45,
    joy: 10,
    consumable: true,
  },
  {
    id: 'smoothie',
    name: 'Peach smoothie',
    category: 'Food',
    cost: 30,
    level: 2,
    art: 'smoothie',
    description: 'A little sunshine in a cup. +40 energy, +10 joy.',
    energy: 40,
    joy: 10,
    consumable: true,
  },
  {
    id: 'mouse',
    name: 'Pocket mouse',
    category: 'Toys',
    cost: 25,
    level: 1,
    art: 'mouse',
    description: 'A tiny friend to chase. +35 joy.',
    joy: 35,
    consumable: true,
  },
  {
    id: 'book',
    name: 'Tiny storybook',
    category: 'Toys',
    cost: 35,
    level: 2,
    art: 'book',
    description: 'A bedtime adventure. Restores 45 joy.',
    joy: 45,
    consumable: true,
  },
  {
    id: 'plant',
    name: 'Little fern',
    category: 'Decor',
    cost: 60,
    level: 1,
    art: 'plant',
    description: 'A leafy friend for your companion’s home.',
  },
  {
    id: 'lamp',
    name: 'Firefly lantern',
    category: 'Decor',
    cost: 90,
    level: 2,
    art: 'lamp',
    description: 'A warm glow for evenings in the meadow.',
  },
  {
    id: 'mushroom',
    name: 'Mushroom cottage',
    category: 'Habitats',
    cost: 150,
    level: 3,
    art: 'mushroom',
    description: 'A storybook home tucked beneath the trees.',
  },
  {
    id: 'cushion',
    name: 'Star pillow',
    category: 'Decor',
    cost: 110,
    level: 2,
    art: 'cushion',
    description: 'A soft little spot for daydreaming.',
  },
  {
    id: 'nightlight',
    name: 'Mushroom glow',
    category: 'Decor',
    cost: 130,
    level: 3,
    art: 'nightlight',
    description: 'A warm mushroom light for your pet’s home.',
  },
  {
    id: 'night',
    name: 'Starlight clearing',
    category: 'Backgrounds',
    cost: 240,
    level: 5,
    art: 'night',
    description: 'A violet garden under a sky full of stars.',
  },
  {
    id: 'sunset',
    name: 'Peach beach',
    category: 'Backgrounds',
    cost: 80,
    level: 1,
    art: 'sunset',
    description: 'Warm sand, lilac waves, and an endless sunset.',
  },
  {
    id: 'cloud',
    name: 'Cloud nine',
    category: 'Backgrounds',
    cost: 160,
    level: 4,
    art: 'cloud',
    description: 'A cotton-candy hideaway above the clouds.',
  },
];
// Old clothing purchases become equally priced scenes. Apply on every read and
// mutation so both offline saves and Neon accounts upgrade without losing progress.
export function upgradeGame(current) {
  if (!current) return current;
  const state = structuredClone(current);
  if (state.pet.species === 'samo' && state.pet.name === 'Samo') state.pet.name = 'Finn';
  for (const [oldId, newId] of [
    ['scarf', 'sunset'],
    ['crown', 'cloud'],
  ]) {
    if (state.inventory[oldId]) state.inventory[newId] = Math.max(1, state.inventory[newId] || 0);
    delete state.inventory[oldId];
    if (state.equipped.outfit === oldId && !state.equipped.background)
      state.equipped.background = newId;
  }
  if (state.equipped.habitat === 'night') {
    state.equipped.background = 'night';
    state.equipped.habitat = null;
  }
  state.equipped.background ??= null;
  delete state.equipped.outfit;
  return state;
}
export const BADGES = [
  {
    id: 'first',
    name: 'First steps',
    description: 'Complete your first quest.',
    target: 1,
    metric: 'quests',
    icon: 'sprout',
  },
  {
    id: 'five',
    name: 'Finding your rhythm',
    description: 'Complete 5 quests.',
    target: 5,
    metric: 'quests',
    icon: 'sparkles',
  },
  {
    id: 'ten',
    name: 'Little victories',
    description: 'Complete 10 quests.',
    target: 10,
    metric: 'quests',
    icon: 'flag',
  },
  {
    id: 'streak',
    name: 'Keep the spark',
    description: 'Build a 3-day streak.',
    target: 3,
    metric: 'streak',
    icon: 'flame',
  },
  {
    id: 'care',
    name: 'A kind heart',
    description: 'Care for your companion 5 times.',
    target: 5,
    metric: 'care',
    icon: 'heart',
  },
  {
    id: 'level',
    name: 'Growing together',
    description: 'Reach companion level 3.',
    target: 3,
    metric: 'level',
    icon: 'star',
  },
];
export function dayKey(now = Date.now(), timezone = 'Asia/Manila') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
}
export function levelFor(xp) {
  return 1 + Math.floor(xp / 150);
}
export function createGame(species = 'cat', now = Date.now()) {
  return {
    schema: 1,
    startedAt: new Date(now).toISOString(),
    timezone: 'Asia/Manila',
    name: 'Adventurer',
    pet: {
      species,
      name: SPECIES.find((s) => s.id === species)?.name || 'Mochi',
      energy: 85,
      joy: 90,
      updatedAt: now,
    },
    coins: 60,
    xp: 0,
    tasks: [
      {
        id: 'starter-1',
        title: 'Make space for one important thing',
        notes: 'Choose one small task that will make today feel good.',
        category: 'Work',
        difficulty: 'steady',
        recurrence: 'once',
        due: '',
        createdAt: now,
      },
      {
        id: 'starter-2',
        title: 'Take a little walk outside',
        notes: 'A few fresh-air minutes count.',
        category: 'Wellbeing',
        difficulty: 'gentle',
        recurrence: 'daily',
        due: '',
        createdAt: now,
      },
      {
        id: 'starter-3',
        title: 'Read a few pages',
        notes: 'A book, an article, or something that sparks your curiosity.',
        category: 'Learning',
        difficulty: 'gentle',
        recurrence: 'daily',
        due: '',
        createdAt: now,
      },
      {
        id: 'starter-4',
        title: 'Tidy your corner of the world',
        notes: 'Just one surface. No need to do it all.',
        category: 'Home',
        difficulty: 'gentle',
        recurrence: 'daily',
        due: '',
        createdAt: now,
      },
    ],
    completions: [],
    inventory: { berry: 2, ball: 1 },
    equipped: { decor: [], background: null, habitat: null },
    careCount: 0,
    bonusDays: [],
    activity: [],
    settings: { theme: 'system', motion: true, sound: false, dailyGoal: 3 },
  };
}
export function petStats(state, now = Date.now()) {
  const hours = Math.max(0, (now - state.pet.updatedAt) / 3600000);
  return {
    energy: Math.max(20, Math.round(state.pet.energy - Math.min(hours, 24) * 1.5)),
    joy: Math.max(20, Math.round(state.pet.joy - Math.min(hours, 24))),
  };
}
export function completed(state, task, now = Date.now()) {
  return state.completions.some(
    (c) =>
      c.taskId === task.id && (task.recurrence === 'once' || c.day === dayKey(now, state.timezone)),
  );
}
export function streakFor(state, now = Date.now()) {
  const days = new Set(state.completions.map((c) => c.day));
  const today = dayKey(now, state.timezone);
  let cursor = new Date(`${today}T12:00:00Z`);
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
export function metricsFor(state, now) {
  return {
    quests: state.completions.length,
    streak: streakFor(state, now),
    care: state.careCount,
    level: levelFor(state.xp),
  };
}
function cleanText(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new Error(`${label} must be 1–${max} characters.`);
  return value.trim();
}
function taskFields(data) {
  if (
    !CATEGORIES.includes(data.category) ||
    !DIFFICULTIES[data.difficulty] ||
    !['once', 'daily'].includes(data.recurrence)
  )
    throw new Error('Choose a valid category, effort, and repeat option.');
  const due = data.due || '';
  if (due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || Number.isNaN(Date.parse(due))))
    throw new Error('Choose a valid due date.');
  if (typeof data.notes !== 'string' || data.notes.length > 1000)
    throw new Error('Notes must be under 1,000 characters.');
  return {
    title: cleanText(data.title, 100, 'Quest title'),
    notes: data.notes.trim(),
    category: data.category,
    difficulty: data.difficulty,
    recurrence: data.recurrence,
    due,
  };
}
// This reducer runs on the server and for optimistic account previews. Rewards and prices are never accepted from the client.
export function applyAction(current, action, now = Date.now()) {
  const state = upgradeGame(current);
  const previousLevel = levelFor(current.xp);
  if (!action || typeof action.type !== 'string') throw new Error('Choose an action.');
  const day = dayKey(now, state.timezone);
  let message = '';
  switch (action.type) {
    case 'task.create': {
      if (state.tasks.length >= 200)
        throw new Error('Your journal holds 200 quests. Clear an old quest to make space.');
      if (
        typeof action.taskId !== 'string' ||
        !/^[a-zA-Z0-9-]{8,64}$/.test(action.taskId) ||
        state.tasks.some((t) => t.id === action.taskId)
      )
        throw new Error('This quest already exists or has an invalid ID.');
      state.tasks.push({ ...taskFields(action.data), id: action.taskId, createdAt: now });
      message = 'A new adventure awaits.';
      break;
    }
    case 'task.edit': {
      const task = state.tasks.find((t) => t.id === action.taskId);
      if (!task) throw new Error('This quest could not be found.');
      // A finished one-time task stays finished: changing its repeat rule cannot re-award it.
      if (task.recurrence === 'once' && completed(state, task, now))
        throw new Error('Completed one-time quests cannot be edited.');
      Object.assign(task, taskFields(action.data));
      message = 'Quest updated.';
      break;
    }
    case 'task.delete':
      state.tasks = state.tasks.filter((t) => t.id !== action.taskId);
      message = 'Quest removed. Your earned rewards stay with you.';
      break;
    case 'task.complete': {
      const task = state.tasks.find((t) => t.id === action.taskId);
      if (!task) throw new Error('This quest could not be found.');
      if (completed(state, task, now))
        throw new Error('You have already earned this quest’s rewards.');
      const reward = DIFFICULTIES[task.difficulty];
      state.coins += reward.coins;
      state.xp += reward.xp;
      state.completions.push({
        taskId: task.id,
        title: task.title,
        category: task.category,
        day,
        at: now,
        coins: reward.coins,
        xp: reward.xp,
      });
      state.pet.lastInteraction = { kind: 'quest', at: now };
      message = `Quest complete! +${reward.coins} coins · +${reward.xp} XP`;
      if (
        state.completions.filter((c) => c.day === day).length >= 3 &&
        !state.bonusDays.includes(day)
      ) {
        state.coins += 20;
        state.xp += 25;
        state.bonusDays.push(day);
        message += ' · Daily bonus +20 coins!';
      }
      break;
    }
    case 'item.buy': {
      const item = CATALOG.find((i) => i.id === action.itemId);
      if (!item) throw new Error('This item could not be found.');
      if (levelFor(state.xp) < item.level)
        throw new Error(`This item unlocks at level ${item.level}.`);
      if (!item.consumable && state.inventory[item.id])
        throw new Error('You already own this item.');
      if (state.coins < item.cost)
        throw new Error('A few more quests will get you there. You need more coins.');
      if ((state.inventory[item.id] || 0) >= 99)
        throw new Error('Your backpack already has plenty of this item.');
      state.coins -= item.cost;
      state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;
      message = `${item.name} added to your backpack.`;
      if (action.equip === true && !item.consumable) {
        if (item.category === 'Decor')
          state.equipped.decor = [...new Set([...state.equipped.decor, item.id])];
        else state.equipped[item.category === 'Backgrounds' ? 'background' : 'habitat'] = item.id;
        message = `${item.name} applied.`;
      }
      break;
    }
    case 'item.care': {
      const item = CATALOG.find((i) => i.id === action.itemId);
      if (!item?.consumable) throw new Error('Choose a snack or toy.');
      if (levelFor(state.xp) < item.level) throw new Error(`Unlocks at level ${item.level}.`);
      if (!state.inventory[item.id]) {
        if (state.coins < item.cost)
          throw new Error(`You need ${item.cost - state.coins} more coins.`);
        state.coins -= item.cost;
      } else state.inventory[item.id]--;
      const stats = petStats(state, now);
      state.pet.energy = Math.min(100, stats.energy + (item.energy || 0));
      state.pet.joy = Math.min(100, stats.joy + (item.joy || 0));
      state.pet.updatedAt = now;
      state.pet.lastInteraction = { kind: item.category === 'Food' ? 'food' : 'play', at: now };
      state.careCount++;
      message = `${state.pet.name}: +${item.energy || item.joy} ${item.energy ? 'energy' : 'joy'}!`;
      break;
    }
    case 'pet.switch': {
      const companion = COMPANIONS.find((c) => c.id === action.species);
      if (!companion) throw new Error('Choose a companion.');
      if (state.pet.species !== companion.id) state.pet.name = companion.name;
      state.pet.species = companion.id;
      state.pet.lastInteraction = { kind: 'hello', at: now };
      message = `Hello, ${state.pet.name}!`;
      break;
    }
    case 'item.use': {
      const item = CATALOG.find((i) => i.id === action.itemId);
      if (!item || !state.inventory[item.id])
        throw new Error('Find this item in the market first.');
      if (item.consumable) {
        const stats = petStats(state, now);
        state.pet.energy = Math.min(100, stats.energy + (item.energy || 0));
        state.pet.joy = Math.min(100, stats.joy + (item.joy || 0));
        state.pet.updatedAt = now;
        state.inventory[item.id]--;
        state.careCount++;
        state.pet.lastInteraction = { kind: item.category === 'Food' ? 'food' : 'play', at: now };
        message = `${state.pet.name} loved that. +${item.energy || item.joy} ${item.energy ? 'energy' : 'joy'}!`;
      } else if (item.category === 'Decor') {
        const list = state.equipped.decor;
        state.equipped.decor = list.includes(item.id)
          ? list.filter((id) => id !== item.id)
          : [...list, item.id];
        message = 'Your habitat has a fresh little touch.';
      } else {
        const slot = item.category === 'Backgrounds' ? 'background' : 'habitat';
        state.equipped[slot] = state.equipped[slot] === item.id ? null : item.id;
        message = 'A fresh look for your adventure.';
      }
      break;
    }
    case 'background.reset':
      state.equipped.background = null;
      message = 'Back to the dream garden.';
      break;
    case 'profile.update': {
      state.name = cleanText(action.name, 30, 'Your name');
      state.pet.name = cleanText(action.petName, 20, 'Companion name');
      if (!SPECIES.some((s) => s.id === action.species)) throw new Error('Choose a companion.');
      state.pet.species = action.species;
      try {
        new Intl.DateTimeFormat('en', { timeZone: action.timezone });
      } catch {
        throw new Error('Choose a valid timezone.');
      }
      if (typeof action.timezone !== 'string' || action.timezone.length > 80)
        throw new Error('Choose a valid timezone.');
      state.timezone = action.timezone;
      message = 'Your adventure, your way.';
      break;
    }
    case 'settings.update': {
      const s = action.settings;
      if (
        !s ||
        !['system', 'light', 'dark'].includes(s.theme) ||
        typeof s.motion !== 'boolean' ||
        typeof s.sound !== 'boolean' ||
        ![1, 3, 5, 7].includes(s.dailyGoal)
      )
        throw new Error('Choose valid preferences.');
      state.settings = { theme: s.theme, motion: s.motion, sound: s.sound, dailyGoal: s.dailyGoal };
      message = 'Preferences saved.';
      break;
    }
    default:
      throw new Error('This action is not supported.');
  }
  if (levelFor(state.xp) > previousLevel)
    message += ` · ${state.pet.name} reached level ${levelFor(state.xp)}!`;
  state.activity = [
    { id: action.id, type: action.type, message, at: now },
    ...state.activity,
  ].slice(0, 100);
  return { state, message };
}
