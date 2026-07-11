// Content class discriminator
export type ContentClass = 'shapes' | 'letters' | 'numbers';

// Shape types - all 16 shapes
export type ShapeType =
  | 'circle'
  | 'semicircle'
  | 'hexagon'
  | 'square'
  | 'rectangle'
  | 'pentagon'
  | 'triangle'
  | 'heptagon'
  | 'octagon'
  | 'oval'
  | 'heart'
  | 'cross'
  | 'star'
  | 'diamond'
  | 'arrow'
  | 'trapezoid';

// Letter types - A through Z
export type LetterType =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'
  | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

// Number types - 1 through 20 as strings
export type NumberType =
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20';

// Union type for all item types
export type ItemType = ShapeType | LetterType | NumberType;

// All shape types as array for iteration
export const ALL_SHAPES: ShapeType[] = [
  'circle',
  'semicircle',
  'hexagon',
  'square',
  'rectangle',
  'pentagon',
  'triangle',
  'heptagon',
  'octagon',
  'oval',
  'heart',
  'cross',
  'star',
  'diamond',
  'arrow',
  'trapezoid',
];

// All letter types as array for iteration
export const ALL_LETTERS: LetterType[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

// All number types as array for iteration
export const ALL_NUMBERS: NumberType[] = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
];

// Fixed colors per shape type
export const SHAPE_COLORS: Record<ShapeType, string> = {
  circle: '#FF0000',      // Red
  semicircle: '#FF8C00',  // Orange
  hexagon: '#FFD700',     // Yellow
  square: '#00CC00',      // Green
  rectangle: '#00BFFF',   // Cyan
  pentagon: '#4B0082',    // Indigo
  triangle: '#8B00FF',    // Violet
  heptagon: '#FF00FF',    // Magenta
  octagon: '#FF6B6B',     // Coral
  oval: '#4ECDC4',        // Teal
  heart: '#E91E63',       // Pink
  cross: '#9C27B0',       // Purple
  star: '#FFC107',        // Amber
  diamond: '#00BCD4',     // Cyan
  arrow: '#795548',       // Brown
  trapezoid: '#607D8B',   // Blue Grey
};

// Letter colors - rainbow cycle through the alphabet
export const LETTER_COLORS: Record<LetterType, string> = {
  A: '#FF0000',  // Red
  B: '#FF4500',  // OrangeRed
  C: '#FF8C00',  // DarkOrange
  D: '#FFA500',  // Orange
  E: '#FFD700',  // Gold
  F: '#FFFF00',  // Yellow
  G: '#9ACD32',  // YellowGreen
  H: '#00CC00',  // Green
  I: '#00FA9A',  // MediumSpringGreen
  J: '#00CED1',  // DarkTurquoise
  K: '#00BFFF',  // DeepSkyBlue
  L: '#1E90FF',  // DodgerBlue
  M: '#0000FF',  // Blue
  N: '#4B0082',  // Indigo
  O: '#8B00FF',  // Violet
  P: '#9932CC',  // DarkOrchid
  Q: '#BA55D3',  // MediumOrchid
  R: '#FF00FF',  // Magenta
  S: '#FF1493',  // DeepPink
  T: '#FF69B4',  // HotPink
  U: '#E91E63',  // Pink
  V: '#F44336',  // Red-ish
  W: '#795548',  // Brown
  X: '#607D8B',  // BlueGrey
  Y: '#9C27B0',  // Purple
  Z: '#673AB7',  // DeepPurple
};

// Number colors - Material palette
export const NUMBER_COLORS: Record<NumberType, string> = {
  '1': '#F44336',   // Red
  '2': '#E91E63',   // Pink
  '3': '#9C27B0',   // Purple
  '4': '#673AB7',   // Deep Purple
  '5': '#3F51B5',   // Indigo
  '6': '#2196F3',   // Blue
  '7': '#03A9F4',   // Light Blue
  '8': '#00BCD4',   // Cyan
  '9': '#009688',   // Teal
  '10': '#4CAF50',  // Green
  '11': '#8BC34A',  // Light Green
  '12': '#CDDC39',  // Lime
  '13': '#FFEB3B',  // Yellow
  '14': '#FFC107',  // Amber
  '15': '#FF9800',  // Orange
  '16': '#FF5722',  // Deep Orange
  '17': '#795548',  // Brown
  '18': '#9E9E9E',  // Grey
  '19': '#607D8B',  // Blue Grey
  '20': '#000000',  // Black
};

// Helper function to get item color based on type and content class
export function getItemColor(itemType: ItemType, contentClass: ContentClass): string {
  switch (contentClass) {
    case 'shapes':
      return SHAPE_COLORS[itemType as ShapeType] || '#888888';
    case 'letters':
      return LETTER_COLORS[itemType as LetterType] || '#888888';
    case 'numbers':
      return NUMBER_COLORS[itemType as NumberType] || '#888888';
    default:
      return '#888888';
  }
}

// Helper to check what content class an item belongs to
export function getContentClassForItem(itemType: ItemType): ContentClass {
  if (ALL_SHAPES.includes(itemType as ShapeType)) return 'shapes';
  if (ALL_LETTERS.includes(itemType as LetterType)) return 'letters';
  if (ALL_NUMBERS.includes(itemType as NumberType)) return 'numbers';
  return 'shapes'; // default fallback
}

// Get all items for a content class
export function getItemsForContentClass(contentClass: ContentClass): ItemType[] {
  switch (contentClass) {
    case 'shapes':
      return ALL_SHAPES;
    case 'letters':
      return ALL_LETTERS;
    case 'numbers':
      return ALL_NUMBERS;
    default:
      return ALL_SHAPES;
  }
}

// Position in 2D space
export interface Position {
  x: number;
  y: number;
}

// Size dimensions
export interface Size {
  width: number;
  height: number;
}

// Bounding box for collision detection
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// A piece on the canvas (draggable) - generic for shapes, letters, numbers
export interface ItemPiece {
  id: string;
  itemType: ItemType;
  position: Position;
  isDragging: boolean;
  createdAt: number;
}

// Legacy alias for backward compatibility
export type ShapePiece = ItemPiece;

// A hole in the puzzle that needs to be filled
export interface PuzzleHole {
  id: string;
  itemType: ItemType;
  position: Position;
  filled: boolean;
}

// A puzzle definition
export interface Puzzle {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number; // seconds
  holes: PuzzleHole[];
  contentClass: ContentClass;
}

// Per-content-class progression tracking
export interface ContentProgression {
  currentPuzzleIndex: number;
  failCount: number;
}

// Game state
export interface GameState {
  activeContentClass: ContentClass;
  currentPuzzle: Puzzle | null;
  pieces: ItemPiece[];
  timeRemaining: number;
  isComplete: boolean;
  progression: Record<ContentClass, ContentProgression>;
}

// Get shape size (responsive based on viewport)
export function getShapeSize(): number {
  return Math.min(window.innerWidth, window.innerHeight) * 0.08; // 8vmin
}

// Utility type for component props
export interface WithChildren {
  children?: React.ReactNode;
}

export interface WithClassName {
  className?: string;
}
