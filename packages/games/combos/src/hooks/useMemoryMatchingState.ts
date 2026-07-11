import { useReducer, useCallback } from 'react';
import type { GameCard, Combo, ComboType } from '../types';
import { generateMemoryPairs, combosMatch } from '../data/comboGenerator';

interface MemoryMatchingState {
  cards: GameCard[];
  flippedCardIds: string[];
  matchedPairCount: number;
  comboText: string | null;
  isComplete: boolean;
  isProcessing: boolean;
  faceUp: boolean;
}

type Action =
  | { type: 'INIT_CARDS'; comboType: ComboType; pairCount: number; faceUp: boolean }
  | { type: 'FLIP_CARD'; cardId: string }
  | { type: 'MATCH_SUCCESS' }
  | { type: 'MATCH_FAIL' }
  | { type: 'COMPLETE' }
  | { type: 'SET_COMBO_TEXT'; text: string | null };

const initialState: MemoryMatchingState = {
  cards: [],
  flippedCardIds: [],
  matchedPairCount: 0,
  comboText: null,
  isComplete: false,
  isProcessing: false,
  faceUp: false,
};

function reducer(state: MemoryMatchingState, action: Action): MemoryMatchingState {
  switch (action.type) {
    case 'INIT_CARDS': {
      const combos = generateMemoryPairs(action.comboType, action.pairCount);
      const cards: GameCard[] = combos.map((combo, i) => ({
        id: `card-${i}`,
        combo,
        state: action.faceUp ? 'face-up' as const : 'face-down' as const,
      }));
      return {
        ...initialState,
        cards,
        faceUp: action.faceUp,
      };
    }

    case 'FLIP_CARD': {
      if (state.isProcessing) return state;
      if (state.flippedCardIds.length >= 2) return state;
      if (state.flippedCardIds.includes(action.cardId)) return state;

      const card = state.cards.find(c => c.id === action.cardId);
      if (!card) return state;

      // In face-up mode: allow selecting visible cards; in normal mode: only face-down
      const allowedState = state.faceUp ? 'face-up' : 'face-down';
      if (card.state !== allowedState) return state;

      // In face-up mode cards stay as-is; in normal mode flip to face-up
      const newCards = state.faceUp
        ? state.cards
        : state.cards.map(c =>
            c.id === action.cardId ? { ...c, state: 'face-up' as const } : c
          );
      const newFlipped = [...state.flippedCardIds, action.cardId];

      return {
        ...state,
        cards: newCards,
        flippedCardIds: newFlipped,
        isProcessing: newFlipped.length >= 2,
      };
    }

    case 'MATCH_SUCCESS': {
      const [id1, id2] = state.flippedCardIds;
      const newCards = state.cards.map(c =>
        c.id === id1 || c.id === id2 ? { ...c, state: 'matched' as const } : c
      );
      const newCount = state.matchedPairCount + 1;
      const totalPairs = state.cards.length / 2;
      const isComplete = newCount >= totalPairs;

      return {
        ...state,
        cards: newCards,
        flippedCardIds: [],
        matchedPairCount: newCount,
        isProcessing: false,
        isComplete,
      };
    }

    case 'MATCH_FAIL': {
      const [id1, id2] = state.flippedCardIds;
      // In face-up mode, cards stay visible; in normal mode, flip back
      const newCards = state.faceUp
        ? state.cards
        : state.cards.map(c =>
            c.id === id1 || c.id === id2 ? { ...c, state: 'face-down' as const } : c
          );

      return {
        ...state,
        cards: newCards,
        flippedCardIds: [],
        isProcessing: false,
      };
    }

    case 'COMPLETE':
      return { ...state, isComplete: true };

    case 'SET_COMBO_TEXT':
      return { ...state, comboText: action.text };

    default:
      return state;
  }
}

export function useMemoryMatchingState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const initCards = useCallback((comboType: ComboType, pairCount: number = 10, faceUp: boolean = false) => {
    dispatch({ type: 'INIT_CARDS', comboType, pairCount, faceUp });
  }, []);

  const flipCard = useCallback((cardId: string) => {
    dispatch({ type: 'FLIP_CARD', cardId });
  }, []);

  const checkMatch = useCallback(() => {
    if (state.flippedCardIds.length < 2) return false;

    const card1 = state.cards.find(c => c.id === state.flippedCardIds[0]);
    const card2 = state.cards.find(c => c.id === state.flippedCardIds[1]);

    if (!card1 || !card2) return false;

    if (combosMatch(card1.combo, card2.combo)) {
      dispatch({ type: 'MATCH_SUCCESS' });
      return true;
    } else {
      // Delay the flip-back to let the player see both cards
      setTimeout(() => {
        dispatch({ type: 'MATCH_FAIL' });
      }, 1200);
      return false;
    }
  }, [state.flippedCardIds, state.cards]);

  const setComboText = useCallback((text: string | null) => {
    dispatch({ type: 'SET_COMBO_TEXT', text });
  }, []);

  const getFlippedCombo = useCallback((): Combo | null => {
    if (state.flippedCardIds.length === 0) return null;
    const lastFlippedId = state.flippedCardIds[state.flippedCardIds.length - 1];
    const card = state.cards.find(c => c.id === lastFlippedId);
    return card?.combo ?? null;
  }, [state.flippedCardIds, state.cards]);

  return {
    state,
    actions: {
      initCards,
      flipCard,
      checkMatch,
      setComboText,
      getFlippedCombo,
    },
  };
}
