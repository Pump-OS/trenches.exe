// ============================================================
// Name Generator — meme-style token name generation
// ============================================================

const animals = [
  'Doge', 'Shiba', 'Pepe', 'Cat', 'Monkey', 'Hamster', 'Frog', 'Pig', 'Bear', 'Bull',
  'Fox', 'Owl', 'Eagle', 'Rat', 'Whale', 'Penguin', 'Panda', 'Tiger', 'Llama', 'Crab',
  'Bat', 'Seal', 'Otter', 'Gecko', 'Axolotl', 'Capybara', 'Quokka', 'Platypus',
];

const prefixes = [
  'Baby', 'Super', 'Mega', 'Ultra', 'Mini', 'Dark', 'Turbo', 'Giga', 'Hyper', 'Based',
  'Floki', 'King', 'Lord', 'Chief', 'Captain', 'Dr.', 'Mr.', 'Alpha', 'Sigma', 'Chad',
];

const suffixes = [
  'Inu', 'Moon', 'Rocket', 'Finance', 'Swap', 'Coin', 'Token', 'DAO', 'AI', 'Bot',
  'Protocol', 'Chain', 'Verse', 'Fi', 'X', 'GPT', 'Pro', 'Max', 'Classic',
];

const memeWords = [
  'HODL', 'WAGMI', 'NGMI', 'FOMO', 'COPE', 'BONK', 'BOOP', 'WIF', 'HAT', 'POPCAT',
  'GMGN', 'DEGEN', 'APE', 'PUMP', 'MOON', 'LAMBO', 'YOLO', 'GG', 'KEK', 'LOL',
  'SHILL', 'REKT', 'FUD', 'NPC', 'SIGMA', 'CHAD', 'BASED',
];

const foods = [
  'Pizza', 'Burger', 'Taco', 'Sushi', 'Ramen', 'Banana', 'Donut', 'Cookie', 'Cake',
  'Tendies', 'Nuggies', 'Waffle', 'Burrito',
];

const popCulture = [
  'Elon', 'Trump', 'Satoshi', 'Vitalik', 'Ansem', 'Solana', 'Matrix', 'Goku',
  'Thanos', 'Harambe', 'Musk', 'CZ', 'Wojak', 'Bogdanoff',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function maybe(fn: () => string, chance: number = 0.3): string {
  return Math.random() < chance ? fn() : '';
}

const nameStrategies: (() => string)[] = [
  // Prefix + Animal
  () => `${pick(prefixes)} ${pick(animals)}`,
  // Animal + Suffix
  () => `${pick(animals)}${pick(suffixes)}`,
  // Meme word
  () => pick(memeWords),
  // Pure food meme
  () => `${maybe(() => pick(prefixes) + ' ', 0.4)}${pick(foods)}`,
  // Pop culture reference
  () => `${pick(popCulture)}${maybe(() => ' ' + pick(suffixes), 0.5)}`,
  // Animal + Animal
  () => `${pick(animals)}${pick(animals)}`,
  // Prefix + Meme
  () => `${pick(prefixes)} ${pick(memeWords)}`,
  // "X but Y" format
  () => `${pick(animals)} WIF ${pick(foods)}`,
  // Concept + AI/GPT hype
  () => `${pick(animals)}GPT`,
  // Double prefix
  () => `${pick(prefixes)}${pick(prefixes)}`,
];

export interface TokenIdentity {
  name: string;
  ticker: string;
  avatar: string;
}

const usedNames = new Set<string>();
let nameGenCount = 0;

export function generateTokenIdentity(): TokenIdentity {
  let name = '';
  let attempts = 0;

  while (attempts < 50) {
    const strategy = pick(nameStrategies);
    const candidate = strategy();
    if (candidate && !usedNames.has(candidate.toUpperCase())) {
      name = candidate;
      break;
    }
    attempts++;
  }

  if (!name) {
    name = `${pick(animals)}${++nameGenCount}`;
  }

  usedNames.add(name.toUpperCase());

  // Periodically clean old names to prevent memory leak
  if (usedNames.size > 200) {
    const names = Array.from(usedNames);
    // Keep only the most recent 100
    for (let i = 0; i < names.length - 100; i++) {
      usedNames.delete(names[i]);
    }
  }

  // Generate ticker from name
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const ticker = cleaned.slice(0, 5) || 'TOKEN';

  const emojis = ['🐸', '🐕', '🦊', '🐱', '🐵', '🐷', '🐻', '🐂', '🦅', '🐧', '🐼', '🐯',
    '🦙', '🦀', '🦇', '🦦', '🐢', '🐰', '🦎', '🐹', '💀', '🔥', '⚡', '🌙', '🚀', '💎', '🎮'];
  const avatar = pick(emojis);

  return { name, ticker, avatar };
}

export function resetUsedNames(): void {
  usedNames.clear();
  nameGenCount = 0;
}
