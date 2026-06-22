// Numberblocks official color palette
export const NUMBERBLOCK_COLORS: Record<number, string> = {
  1: '#FF0000',  // Red
  2: '#FF8C00',  // Orange
  3: '#FFD700',  // Yellow
  4: '#00CC00',  // Green
  5: '#00BFFF',  // Cyan
  6: '#4B0082',  // Indigo
  7: '#8B00FF',  // Violet
  8: '#FF00FF',  // Magenta
  9: '#808080',  // Grey
  10: '#FFFFFF', // White (with red stripe pattern)
};

// For numbers > 10, we cycle or use patterns
export function getNumberBlockColor(value: number): string {
  if (value <= 10) {
    return NUMBERBLOCK_COLORS[value];
  }
  // For larger numbers, use the ones digit color with modifications
  const onesDigit = value % 10 || 10;
  return NUMBERBLOCK_COLORS[onesDigit];
}

// Check if number needs stripe pattern (multiples of 10)
export function needsStripePattern(value: number): boolean {
  return value >= 10 && value % 10 === 0;
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

// NumberBlock entity
export interface NumberBlock {
  id: string;
  value: number;
  position: Position;
  isDragging: boolean;
  createdAt: number; // timestamp for cooldown on new blocks
}

// Letter block (for future use)
export interface LetterBlock {
  id: string;
  letter: string;
  position: Position;
  isDragging: boolean;
}

// Block type discriminator
export type Block =
  | { type: 'number'; data: NumberBlock }
  | { type: 'letter'; data: LetterBlock };

// Cube dimensions - dynamic based on viewport (6vmin)
// These functions return pixel values that match CSS vmin calculations
export function getCubeSize(): number {
  return Math.min(window.innerWidth, window.innerHeight) * 0.06; // 6vmin
}

export function getCubeGap(): number {
  return Math.min(window.innerWidth, window.innerHeight) * 0.004; // 0.4vmin
}

// Legacy constants for backwards compatibility (used in some CSS)
export const CUBE_SIZE = 48;
export const CUBE_GAP = 2;
export const FACE_SIZE = 32; // size of the face on top cube

// Helper: get dimensions for a sub-block (values < 100)
function getSubBlockDimensions(value: number): Size {
  if (value === 0) return { width: 0, height: 0 };

  const cubeSize = getCubeSize();
  const cubeGap = getCubeGap();

  // 4 is a 2x2 square
  if (value === 4) {
    return {
      width: cubeSize * 2 + cubeGap,
      height: cubeSize * 2 + cubeGap,
    };
  }

  // 7 is special - always vertical (rainbow tower)
  if (value === 7) {
    return {
      width: cubeSize,
      height: value * cubeSize + (value - 1) * cubeGap,
    };
  }

  // 9 is a 3x3 square
  if (value === 9) {
    return {
      width: cubeSize * 3 + cubeGap * 2,
      height: cubeSize * 3 + cubeGap * 2,
    };
  }

  // Blocks stack vertically for values 1-3, 5
  if (value <= 5) {
    return {
      width: cubeSize,
      height: value * cubeSize + (value - 1) * cubeGap,
    };
  }

  // 6-29: 2 columns wide
  // 30-99: column count matches tens digit
  let cols = 2;
  if (value >= 30) {
    cols = Math.floor(value / 10);
  }
  const rows = Math.ceil(value / cols);
  return {
    width: cols * cubeSize + (cols - 1) * cubeGap,
    height: rows * cubeSize + (rows - 1) * cubeGap,
  };
}

// Calculate block dimensions based on value
export function getBlockDimensions(value: number): Size {
  // For values < 100, use simple layout
  if (value < 100) {
    return getSubBlockDimensions(value);
  }

  const cubeSize = getCubeSize();
  const cubeGap = getCubeGap();

  // For values 100-999: hundreds as 10×10 squares + remainder
  const hundreds = Math.floor(value / 100);
  const tensAndUnits = value % 100;

  // Size of a 10×10 hundred-square
  const hundredSquareSize = 10 * cubeSize + 9 * cubeGap;
  const hundredSquareSpacing = hundredSquareSize + cubeGap * 2;

  // Arrange hundred-squares
  let hundredCols = 1;
  if (hundreds >= 4) hundredCols = 2;
  if (hundreds >= 7) hundredCols = 3;
  const hundredRows = Math.ceil(hundreds / hundredCols);

  // Hundreds area dimensions
  const hundredsWidth = hundredCols * hundredSquareSpacing - cubeGap * 2;
  const hundredsHeight = hundredRows * hundredSquareSpacing - cubeGap * 2;

  // Remainder dimensions
  const remainderDims = getSubBlockDimensions(tensAndUnits);

  // Total dimensions
  let totalWidth = hundredsWidth;
  let totalHeight = hundredsHeight;

  if (tensAndUnits > 0) {
    // Remainder is to the right
    totalWidth = hundredsWidth + cubeGap * 4 + remainderDims.width;
    // Height is max of hundreds and remainder
    totalHeight = Math.max(hundredsHeight, remainderDims.height);
  }

  return { width: totalWidth, height: totalHeight };
}

// Get bounding box for a number block
export function getBlockBoundingBox(block: NumberBlock): BoundingBox {
  const dims = getBlockDimensions(block.value);
  return {
    x: block.position.x,
    y: block.position.y,
    width: dims.width,
    height: dims.height,
  };
}

// Check if two bounding boxes overlap
export function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Check if two number blocks are colliding
export function blocksCollide(a: NumberBlock, b: NumberBlock): boolean {
  return boxesOverlap(getBlockBoundingBox(a), getBlockBoundingBox(b));
}

// Voice input types
export interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
}

// LLM types
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Utility type for component props
export interface WithChildren {
  children?: React.ReactNode;
}

export interface WithClassName {
  className?: string;
}
