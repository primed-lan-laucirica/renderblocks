import type { Puzzle, PuzzleHole, NumberType, ContentClass } from '../types';
import { calculatePlayAreaBounds, calculateGridPositions } from '../utils/layout';

// Puzzle definition using rows of numbers for symmetrical layout
interface NumberPuzzleDefinition {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  rows: NumberType[][];
}

// 5 number puzzles with progressive chunks
const numberPuzzleDefinitions: NumberPuzzleDefinition[] = [
  // 1-4 (4 numbers)
  {
    id: 'numbers-1',
    name: '1 to 4',
    difficulty: 'easy',
    timeLimit: 45,
    rows: [
      ['1', '2'],
      ['3', '4'],
    ],
  },
  // 1-8 (8 numbers)
  {
    id: 'numbers-2',
    name: '1 to 8',
    difficulty: 'easy',
    timeLimit: 60,
    rows: [
      ['1', '2', '3', '4'],
      ['5', '6', '7', '8'],
    ],
  },
  // 1-12 (12 numbers)
  {
    id: 'numbers-3',
    name: '1 to 12',
    difficulty: 'medium',
    timeLimit: 90,
    rows: [
      ['1', '2', '3', '4'],
      ['5', '6', '7', '8'],
      ['9', '10', '11', '12'],
    ],
  },
  // 1-15 (15 numbers)
  {
    id: 'numbers-4',
    name: '1 to 15',
    difficulty: 'medium',
    timeLimit: 105,
    rows: [
      ['1', '2', '3', '4', '5'],
      ['6', '7', '8', '9', '10'],
      ['11', '12', '13', '14', '15'],
    ],
  },
  // 1-20 (20 numbers)
  {
    id: 'numbers-5',
    name: '1 to 20',
    difficulty: 'hard',
    timeLimit: 120,
    rows: [
      ['1', '2', '3', '4', '5'],
      ['6', '7', '8', '9', '10'],
      ['11', '12', '13', '14', '15'],
      ['16', '17', '18', '19', '20'],
    ],
  },
];

export function getNumberPuzzleWithPositions(
  puzzleId: string,
  canvasWidth: number,
  canvasHeight: number
): Puzzle | null {
  const def = numberPuzzleDefinitions.find((p) => p.id === puzzleId);
  if (!def) return null;

  // Calculate item size (same formula as App.tsx)
  const itemSize = Math.min(canvasWidth, canvasHeight) * 0.08 || 60;

  // Get play area bounds that account for header, palette, and orientation
  const bounds = calculatePlayAreaBounds(canvasWidth, canvasHeight, 'numbers', itemSize);

  // Calculate grid positions within bounds
  const positions = calculateGridPositions(def.rows, bounds);

  // Collect number types from rows - keep in sequence order for learning
  const itemTypes: NumberType[] = def.rows.flat();

  // Create holes with numbers in sequence order (1, 2, 3, ...)
  // This teaches number order - the puzzle challenge comes from the shuffled palette
  const holes: PuzzleHole[] = positions.map((position, index) => ({
    id: `h${index + 1}`,
    itemType: itemTypes[index],
    position,
    filled: false,
  }));

  return {
    id: def.id,
    name: def.name,
    difficulty: def.difficulty,
    timeLimit: def.timeLimit,
    holes,
    contentClass: 'numbers' as ContentClass,
  };
}

export function getNumberPuzzleIds(): string[] {
  return numberPuzzleDefinitions.map((p) => p.id);
}

export function getNextNumberPuzzleId(currentId: string): string | null {
  const ids = getNumberPuzzleIds();
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex === -1 || currentIndex >= ids.length - 1) {
    return null;
  }
  return ids[currentIndex + 1];
}

export default numberPuzzleDefinitions;
