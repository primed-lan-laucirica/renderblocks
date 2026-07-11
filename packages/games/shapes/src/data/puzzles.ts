import type { Puzzle, PuzzleHole, ShapeType, ContentClass } from '../types';
import { calculatePlayAreaBounds, calculateGridPositions } from '../utils/layout';

// Puzzle definition using rows of shapes for symmetrical layout
interface PuzzleDefinition {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  // Each row is an array of shape types, centered automatically
  rows: ShapeType[][];
}

// Raw puzzle definitions - shapes organized in rows for symmetry
const puzzleDefinitions: PuzzleDefinition[] = [
  // EASY PUZZLES (3-4 shapes, 60s)
  {
    id: 'easy-1',
    name: 'First Shapes',
    difficulty: 'easy',
    timeLimit: 60,
    rows: [
      ['circle', 'square', 'triangle'],
    ],
  },
  {
    id: 'easy-2',
    name: 'Heart & Star',
    difficulty: 'easy',
    timeLimit: 60,
    rows: [
      ['heart', 'star'],
      ['diamond'],
    ],
  },
  {
    id: 'easy-3',
    name: 'Four Corners',
    difficulty: 'easy',
    timeLimit: 60,
    rows: [
      ['circle', 'square'],
      ['hexagon', 'oval'],
    ],
  },

  // MEDIUM PUZZLES (6-8 shapes, 90s)
  {
    id: 'medium-1',
    name: 'Shape Garden',
    difficulty: 'medium',
    timeLimit: 90,
    rows: [
      ['circle', 'square', 'triangle'],
      ['heart', 'star'],
      ['diamond'],
    ],
  },
  {
    id: 'medium-2',
    name: 'Polygon Party',
    difficulty: 'medium',
    timeLimit: 90,
    rows: [
      ['pentagon', 'hexagon', 'heptagon'],
      ['octagon', 'rectangle'],
      ['trapezoid'],
    ],
  },
  {
    id: 'medium-3',
    name: 'Mixed Shapes',
    difficulty: 'medium',
    timeLimit: 90,
    rows: [
      ['circle', 'semicircle', 'oval', 'arrow'],
      ['cross', 'star', 'heart'],
    ],
  },

  // HARD PUZZLES (12-16 shapes, 120s)
  {
    id: 'hard-1',
    name: 'Shape Master',
    difficulty: 'hard',
    timeLimit: 120,
    rows: [
      ['circle', 'semicircle', 'hexagon', 'square'],
      ['rectangle', 'pentagon', 'triangle', 'heptagon'],
      ['octagon', 'oval', 'heart', 'cross'],
    ],
  },
  {
    id: 'hard-2',
    name: 'Ultimate Challenge',
    difficulty: 'hard',
    timeLimit: 120,
    rows: [
      ['circle', 'semicircle', 'hexagon', 'square'],
      ['rectangle', 'pentagon', 'triangle', 'heptagon'],
      ['octagon', 'oval', 'heart', 'cross'],
      ['star', 'diamond', 'arrow', 'trapezoid'],
    ],
  },
];

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Calculate positions for a puzzle based on canvas dimensions
export function getPuzzleWithPositions(
  puzzleId: string,
  canvasWidth: number,
  canvasHeight: number
): Puzzle | null {
  const def = puzzleDefinitions.find((p) => p.id === puzzleId);
  if (!def) return null;

  // Calculate item size (same formula as App.tsx)
  const itemSize = Math.min(canvasWidth, canvasHeight) * 0.08 || 60;

  // Get play area bounds that account for header, palette, and orientation
  const bounds = calculatePlayAreaBounds(canvasWidth, canvasHeight, 'shapes', itemSize);

  // Calculate grid positions within bounds
  const positions = calculateGridPositions(def.rows, bounds);

  // Collect shape types from rows
  const shapeTypes: ShapeType[] = def.rows.flat();

  // Shuffle shape types so they're not in predictable order
  const shuffledShapes = shuffleArray(shapeTypes);

  // Create holes with shuffled shapes assigned to positions
  const holes: PuzzleHole[] = positions.map((position, index) => ({
    id: `h${index + 1}`,
    itemType: shuffledShapes[index],
    position,
    filled: false,
  }));

  return {
    id: def.id,
    name: def.name,
    difficulty: def.difficulty,
    timeLimit: def.timeLimit,
    holes,
    contentClass: 'shapes' as ContentClass,
  };
}

// Get all puzzle IDs in order
export function getPuzzleIds(): string[] {
  return puzzleDefinitions.map((p) => p.id);
}

// Get puzzle metadata (for display without positions)
export function getPuzzleMetadata() {
  return puzzleDefinitions.map(({ id, name, difficulty, timeLimit, rows }) => ({
    id,
    name,
    difficulty,
    timeLimit,
    holeCount: rows.reduce((sum, row) => sum + row.length, 0),
  }));
}

// Get next puzzle ID
export function getNextPuzzleId(currentId: string): string | null {
  const ids = getPuzzleIds();
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex === -1 || currentIndex >= ids.length - 1) {
    return null;
  }
  return ids[currentIndex + 1];
}

export default puzzleDefinitions;
