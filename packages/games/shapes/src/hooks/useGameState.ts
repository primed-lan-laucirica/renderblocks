import { useReducer, useCallback, useMemo } from 'react';
import type { GameState, Puzzle, ItemPiece, Position, ItemType, ContentClass, ContentProgression } from '../types';

// Action types
type GameAction =
  | { type: 'START_PUZZLE'; puzzle: Puzzle }
  | { type: 'SPAWN_PIECE'; itemType: ItemType; position: Position }
  | { type: 'MOVE_PIECE'; pieceId: string; position: Position }
  | { type: 'REMOVE_PIECE'; pieceId: string }
  | { type: 'FILL_HOLE'; holeId: string }
  | { type: 'TICK'; seconds: number }
  | { type: 'TIMEOUT' }
  | { type: 'COMPLETE' }
  | { type: 'NEXT_PUZZLE'; puzzle: Puzzle }
  | { type: 'SWITCH_TAB'; contentClass: ContentClass }
  | { type: 'LOAD_PROGRESSION'; progression: Record<ContentClass, ContentProgression>; activeTab: ContentClass }
  | { type: 'UPDATE_PROGRESSION'; contentClass: ContentClass; puzzleIndex: number }
  | { type: 'RESET' };

// Initial progression state
const initialProgression: Record<ContentClass, ContentProgression> = {
  shapes: { currentPuzzleIndex: 0, failCount: 0 },
  letters: { currentPuzzleIndex: 0, failCount: 0 },
  numbers: { currentPuzzleIndex: 0, failCount: 0 },
};

// Initial state
const initialState: GameState = {
  activeContentClass: 'shapes',
  currentPuzzle: null,
  pieces: [],
  timeRemaining: 0,
  isComplete: false,
  progression: initialProgression,
};

// Generate unique ID
let pieceIdCounter = 0;
function generatePieceId(): string {
  return `piece-${++pieceIdCounter}-${Date.now()}`;
}

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_PUZZLE': {
      const contentClass = action.puzzle.contentClass;
      const progression = state.progression[contentClass];
      const baseTime = action.puzzle.timeLimit;
      const bonusTime = progression.failCount * 15;
      return {
        ...state,
        currentPuzzle: action.puzzle,
        pieces: [],
        timeRemaining: baseTime + bonusTime,
        isComplete: false,
      };
    }

    case 'SPAWN_PIECE': {
      const newPiece: ItemPiece = {
        id: generatePieceId(),
        itemType: action.itemType,
        position: action.position,
        isDragging: true,
        createdAt: Date.now(),
      };
      return {
        ...state,
        pieces: [...state.pieces, newPiece],
      };
    }

    case 'MOVE_PIECE': {
      return {
        ...state,
        pieces: state.pieces.map((piece) =>
          piece.id === action.pieceId
            ? { ...piece, position: action.position }
            : piece
        ),
      };
    }

    case 'REMOVE_PIECE': {
      return {
        ...state,
        pieces: state.pieces.filter((piece) => piece.id !== action.pieceId),
      };
    }

    case 'FILL_HOLE': {
      if (!state.currentPuzzle) return state;

      const updatedHoles = state.currentPuzzle.holes.map((hole) =>
        hole.id === action.holeId ? { ...hole, filled: true } : hole
      );

      const allFilled = updatedHoles.every((hole) => hole.filled);

      return {
        ...state,
        currentPuzzle: {
          ...state.currentPuzzle,
          holes: updatedHoles,
        },
        isComplete: allFilled,
      };
    }

    case 'TICK': {
      return {
        ...state,
        timeRemaining: action.seconds,
      };
    }

    case 'TIMEOUT': {
      const contentClass = state.activeContentClass;
      return {
        ...state,
        progression: {
          ...state.progression,
          [contentClass]: {
            ...state.progression[contentClass],
            failCount: state.progression[contentClass].failCount + 1,
          },
        },
        pieces: [],
      };
    }

    case 'COMPLETE': {
      const contentClass = state.activeContentClass;
      return {
        ...state,
        isComplete: true,
        progression: {
          ...state.progression,
          [contentClass]: {
            ...state.progression[contentClass],
            failCount: 0, // Reset fail count on success
          },
        },
      };
    }

    case 'NEXT_PUZZLE': {
      const contentClass = action.puzzle.contentClass;
      const progression = state.progression[contentClass];
      const baseTime = action.puzzle.timeLimit;
      const bonusTime = progression.failCount * 15;
      return {
        ...state,
        currentPuzzle: action.puzzle,
        pieces: [],
        timeRemaining: baseTime + bonusTime,
        isComplete: false,
        progression: {
          ...state.progression,
          [contentClass]: {
            ...state.progression[contentClass],
            currentPuzzleIndex: state.progression[contentClass].currentPuzzleIndex + 1,
          },
        },
      };
    }

    case 'SWITCH_TAB': {
      return {
        ...state,
        activeContentClass: action.contentClass,
        currentPuzzle: null,
        pieces: [],
        isComplete: false,
      };
    }

    case 'LOAD_PROGRESSION': {
      return {
        ...state,
        activeContentClass: action.activeTab,
        progression: {
          shapes: {
            currentPuzzleIndex: action.progression.shapes.currentPuzzleIndex,
            failCount: action.progression.shapes.failCount,
          },
          letters: {
            currentPuzzleIndex: action.progression.letters.currentPuzzleIndex,
            failCount: action.progression.letters.failCount,
          },
          numbers: {
            currentPuzzleIndex: action.progression.numbers.currentPuzzleIndex,
            failCount: action.progression.numbers.failCount,
          },
        },
      };
    }

    case 'UPDATE_PROGRESSION': {
      return {
        ...state,
        progression: {
          ...state.progression,
          [action.contentClass]: {
            ...state.progression[action.contentClass],
            currentPuzzleIndex: action.puzzleIndex,
          },
        },
      };
    }

    case 'RESET': {
      // Reset only the current content class progression
      const contentClass = state.activeContentClass;
      return {
        ...state,
        currentPuzzle: null,
        pieces: [],
        timeRemaining: 0,
        isComplete: false,
        progression: {
          ...state.progression,
          [contentClass]: {
            currentPuzzleIndex: 0,
            failCount: 0,
          },
        },
      };
    }

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const startPuzzle = useCallback((puzzle: Puzzle) => {
    dispatch({ type: 'START_PUZZLE', puzzle });
  }, []);

  const spawnPiece = useCallback((itemType: ItemType, position: Position) => {
    dispatch({ type: 'SPAWN_PIECE', itemType, position });
  }, []);

  const movePiece = useCallback((pieceId: string, position: Position) => {
    dispatch({ type: 'MOVE_PIECE', pieceId, position });
  }, []);

  const removePiece = useCallback((pieceId: string) => {
    dispatch({ type: 'REMOVE_PIECE', pieceId });
  }, []);

  const fillHole = useCallback((holeId: string) => {
    dispatch({ type: 'FILL_HOLE', holeId });
  }, []);

  const updateTime = useCallback((seconds: number) => {
    dispatch({ type: 'TICK', seconds });
  }, []);

  const handleTimeout = useCallback(() => {
    dispatch({ type: 'TIMEOUT' });
  }, []);

  const nextPuzzle = useCallback((puzzle: Puzzle) => {
    dispatch({ type: 'NEXT_PUZZLE', puzzle });
  }, []);

  const switchTab = useCallback((contentClass: ContentClass) => {
    dispatch({ type: 'SWITCH_TAB', contentClass });
  }, []);

  const loadProgression = useCallback(
    (progression: Record<ContentClass, ContentProgression>, activeTab: ContentClass) => {
      dispatch({ type: 'LOAD_PROGRESSION', progression, activeTab });
    },
    []
  );

  const updateProgression = useCallback((contentClass: ContentClass, puzzleIndex: number) => {
    dispatch({ type: 'UPDATE_PROGRESSION', contentClass, puzzleIndex });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const actions = useMemo(
    () => ({
      startPuzzle,
      spawnPiece,
      movePiece,
      removePiece,
      fillHole,
      updateTime,
      handleTimeout,
      nextPuzzle,
      switchTab,
      loadProgression,
      updateProgression,
      reset,
    }),
    [
      startPuzzle,
      spawnPiece,
      movePiece,
      removePiece,
      fillHole,
      updateTime,
      handleTimeout,
      nextPuzzle,
      switchTab,
      loadProgression,
      updateProgression,
      reset,
    ]
  );

  return { state, actions };
}

export default useGameState;
