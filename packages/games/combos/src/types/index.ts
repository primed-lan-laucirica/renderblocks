// ============================================
// RenderCombos Type System
// ============================================

// --- Shape Types (13 shapes) ---

export type ShapeType =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'rectangle'
  | 'star'
  | 'heart'
  | 'oval'
  | 'cross'
  | 'arrow'
  | 'diamond'
  | 'hexagon'
  | 'pentagon'
  | 'octagon';

export const ALL_SHAPES: ShapeType[] = [
  'circle', 'square', 'triangle', 'rectangle', 'star',
  'heart', 'oval', 'cross', 'arrow', 'diamond',
  'hexagon', 'pentagon', 'octagon',
];

// Plural shape names for three-word combo audio/display
export const SHAPE_PLURALS: Record<ShapeType, string> = {
  circle: 'circles',
  square: 'squares',
  triangle: 'triangles',
  rectangle: 'rectangles',
  star: 'stars',
  heart: 'hearts',
  oval: 'ovals',
  cross: 'crosses',
  arrow: 'arrows',
  diamond: 'diamonds',
  hexagon: 'hexagons',
  pentagon: 'pentagons',
  octagon: 'octagons',
};

// --- Color Types (9 colors) ---

export type ColorType =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'black'
  | 'white'
  | 'pink';

export const ALL_COLORS: ColorType[] = [
  'red', 'orange', 'yellow', 'green', 'blue',
  'purple', 'black', 'white', 'pink',
];

export const COLOR_HEX: Record<ColorType, string> = {
  red: '#FF0000',
  orange: '#FF8C00',
  yellow: '#FFD700',
  green: '#00CC00',
  blue: '#0066FF',
  purple: '#9B00FF',
  black: '#222222',
  white: '#FFFFFF',
  pink: '#FF69B4',
};

// --- Count Types (1-5) ---

export type CountType = 1 | 2 | 3 | 4 | 5;

export const ALL_COUNTS: CountType[] = [1, 2, 3, 4, 5];

// Count as words for audio file paths
export const COUNT_WORDS: Record<CountType, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
};

// --- Combo Types ---

export interface TwoWordCombo {
  type: 'two-word';
  color: ColorType;
  shape: ShapeType;
}

export interface ThreeWordCombo {
  type: 'three-word';
  count: CountType;
  color: ColorType;
  shape: ShapeType;
}

export type Combo = TwoWordCombo | ThreeWordCombo;

// --- Combo Display Helpers ---

export function getComboLabel(combo: Combo): string {
  if (combo.type === 'two-word') {
    return `${capitalize(combo.color)} ${capitalize(combo.shape)}`;
  }
  const countWord = COUNT_WORDS[combo.count];
  // Use singular for count=1 ("One Red Circle"), plural for 2+ ("Two Red Circles")
  const shapeName = combo.count === 1 ? combo.shape : SHAPE_PLURALS[combo.shape];
  return `${capitalize(countWord)} ${capitalize(combo.color)} ${capitalize(shapeName)}`;
}

export function getComboAudioPath(combo: Combo): string {
  if (combo.type === 'two-word') {
    return `/games/combos/audio/combos/${combo.color}_${combo.shape}.mp3`;
  }
  const countWord = COUNT_WORDS[combo.count];
  // Use singular for count=1 ("one red circle"), plural for 2+ ("two red circles")
  const shapeName = combo.count === 1 ? combo.shape : SHAPE_PLURALS[combo.shape];
  return `/games/combos/audio/combos/${countWord}_${combo.color}_${shapeName}.mp3`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Card Types ---

export type CardState = 'face-down' | 'face-up' | 'matched' | 'removed';

export interface GameCard {
  id: string;
  combo: Combo;
  state: CardState;
}

// --- Dice Layout Patterns (for three-word card faces) ---

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// Positions as percentages within the card (0-100)
export const DICE_PATTERNS: Record<CountType, Position[]> = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 30, y: 30 }, { x: 70, y: 70 }],
  3: [{ x: 30, y: 25 }, { x: 50, y: 50 }, { x: 70, y: 75 }],
  4: [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 30, y: 70 }, { x: 70, y: 70 }],
  5: [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 50, y: 50 }, { x: 30, y: 70 }, { x: 70, y: 70 }],
};

// --- Screen Set Types ---

export type ScreenSetType = 'memory' | 'building' | 'matching' | 'spin';

export type ComboType = 'two-word' | 'three-word' | 'mixed';

export interface ScreenDefinition {
  id: string;
  screenSetType: ScreenSetType;
  name: string;
  timeLimit: number;
  comboType: ComboType;
  paletteCount?: 2 | 3;       // For building/matching: number of palettes
  targetCount?: number;         // For building: cards to build
  faceUp?: boolean;             // For memory: cards start face-up
}

// --- Progression ---

export interface ScreenSetProgression {
  currentScreenIndex: number;
  failCount: number;
  unlocked: boolean;
}

export type AllProgression = Record<ScreenSetType, ScreenSetProgression>;

// --- Utility Types ---

export interface WithChildren {
  children?: React.ReactNode;
}

export interface WithClassName {
  className?: string;
}
