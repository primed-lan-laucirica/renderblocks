import type { Puzzle, PuzzleHole, LetterType, ContentClass } from '../types';
import { calculatePlayAreaBounds, calculateGridPositions } from '../utils/layout';

// Puzzle definition using rows of letters for symmetrical layout
interface LetterPuzzleDefinition {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  rows: LetterType[][];
}

// 5 letter puzzles with progressive chunks
const letterPuzzleDefinitions: LetterPuzzleDefinition[] = [
  // A-G (7 letters)
  {
    id: 'letters-1',
    name: 'A to G',
    difficulty: 'easy',
    timeLimit: 60,
    rows: [
      ['A', 'B', 'C', 'D'],
      ['E', 'F', 'G'],
    ],
  },
  // A-J (10 letters)
  {
    id: 'letters-2',
    name: 'A to J',
    difficulty: 'easy',
    timeLimit: 75,
    rows: [
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
    ],
  },
  // A-P (16 letters)
  {
    id: 'letters-3',
    name: 'A to P',
    difficulty: 'medium',
    timeLimit: 90,
    rows: [
      ['A', 'B', 'C', 'D', 'E', 'F'],
      ['G', 'H', 'I', 'J', 'K'],
      ['L', 'M', 'N', 'O', 'P'],
    ],
  },
  // A-V (22 letters)
  {
    id: 'letters-4',
    name: 'A to V',
    difficulty: 'hard',
    timeLimit: 120,
    rows: [
      ['A', 'B', 'C', 'D', 'E', 'F'],
      ['G', 'H', 'I', 'J', 'K', 'L'],
      ['M', 'N', 'O', 'P', 'Q'],
      ['R', 'S', 'T', 'U', 'V'],
    ],
  },
  // A-Z (26 letters)
  {
    id: 'letters-5',
    name: 'Full Alphabet',
    difficulty: 'hard',
    timeLimit: 150,
    rows: [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      ['H', 'I', 'J', 'K', 'L', 'M'],
      ['N', 'O', 'P', 'Q', 'R', 'S'],
      ['T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
    ],
  },
];

export function getLetterPuzzleWithPositions(
  puzzleId: string,
  canvasWidth: number,
  canvasHeight: number
): Puzzle | null {
  const def = letterPuzzleDefinitions.find((p) => p.id === puzzleId);
  if (!def) return null;

  // Calculate item size (same formula as App.tsx)
  const itemSize = Math.min(canvasWidth, canvasHeight) * 0.08 || 60;

  // Get play area bounds that account for header, palette, and orientation
  const bounds = calculatePlayAreaBounds(canvasWidth, canvasHeight, 'letters', itemSize);

  // Calculate grid positions within bounds
  const positions = calculateGridPositions(def.rows, bounds);

  // Collect letter types from rows - keep in sequence order for learning
  const itemTypes: LetterType[] = def.rows.flat();

  // Create holes with letters in sequence order (A, B, C, ...)
  // This teaches letter order - the puzzle challenge comes from the shuffled palette
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
    contentClass: 'letters' as ContentClass,
  };
}

export function getLetterPuzzleIds(): string[] {
  return letterPuzzleDefinitions.map((p) => p.id);
}

export function getNextLetterPuzzleId(currentId: string): string | null {
  const ids = getLetterPuzzleIds();
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex === -1 || currentIndex >= ids.length - 1) {
    return null;
  }
  return ids[currentIndex + 1];
}

export default letterPuzzleDefinitions;
