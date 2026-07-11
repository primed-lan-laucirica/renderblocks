import type { Combo, TwoWordCombo, ThreeWordCombo, ComboType, ColorType, ShapeType, CountType } from '../types';
import { ALL_SHAPES, ALL_COLORS, ALL_COUNTS } from '../types';

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Pick a random element from an array
function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate a random two-word combo
function randomTwoWordCombo(): TwoWordCombo {
  return {
    type: 'two-word',
    color: pickRandom(ALL_COLORS),
    shape: pickRandom(ALL_SHAPES),
  };
}

// Generate a random three-word combo
function randomThreeWordCombo(): ThreeWordCombo {
  return {
    type: 'three-word',
    count: pickRandom(ALL_COUNTS),
    color: pickRandom(ALL_COLORS),
    shape: pickRandom(ALL_SHAPES),
  };
}

// Check if two combos are identical
export function combosMatch(a: Combo, b: Combo): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'two-word' && b.type === 'two-word') {
    return a.color === b.color && a.shape === b.shape;
  }
  if (a.type === 'three-word' && b.type === 'three-word') {
    return a.count === b.count && a.color === b.color && a.shape === b.shape;
  }
  return false;
}

// Generate unique combos (no duplicates)
function generateUniqueCombos(count: number, comboType: ComboType): Combo[] {
  const combos: Combo[] = [];
  const seen = new Set<string>();

  const comboKey = (c: Combo): string => {
    if (c.type === 'two-word') return `${c.color}-${c.shape}`;
    return `${c.count}-${c.color}-${c.shape}`;
  };

  while (combos.length < count) {
    let combo: Combo;
    if (comboType === 'two-word') {
      combo = randomTwoWordCombo();
    } else if (comboType === 'three-word') {
      combo = randomThreeWordCombo();
    } else {
      // Mixed: roughly half two-word, half three-word
      combo = combos.length % 2 === 0 ? randomTwoWordCombo() : randomThreeWordCombo();
    }

    const key = comboKey(combo);
    if (!seen.has(key)) {
      seen.add(key);
      combos.push(combo);
    }
  }

  return combos;
}

// Generate pairs for Memory Matching (10 unique combos, duplicated = 20 cards)
export function generateMemoryPairs(comboType: ComboType, pairCount: number = 10): Combo[] {
  const unique = generateUniqueCombos(pairCount, comboType);
  // Duplicate each combo for pairs, then shuffle
  const pairs = [...unique, ...unique.map(c => ({ ...c }))];
  return shuffle(pairs);
}

// Generate target combos for Card Building or Component Matching
export function generateTargetCombos(count: number, comboType: ComboType): Combo[] {
  return generateUniqueCombos(count, comboType);
}

// Generate a single random combo (for Spin game)
export function generateRandomCombo(comboType: ComboType): Combo {
  if (comboType === 'three-word') return randomThreeWordCombo();
  if (comboType === 'two-word') return randomTwoWordCombo();
  // Mixed: 50/50 chance
  return Math.random() < 0.5 ? randomTwoWordCombo() : randomThreeWordCombo();
}

// Check if a set of components matches a combo
export function componentsMatchCombo(
  shape: ShapeType | undefined,
  color: ColorType | undefined,
  count: CountType | undefined,
  combo: Combo,
): boolean {
  if (combo.type === 'two-word') {
    return shape === combo.shape && color === combo.color;
  }
  return shape === combo.shape && color === combo.color && count === combo.count;
}
