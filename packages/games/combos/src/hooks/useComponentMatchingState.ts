import { useReducer, useCallback } from 'react';
import type { GameCard, ComboType, ShapeType, ColorType, CountType } from '../types';
import { generateTargetCombos } from '../data/comboGenerator';

interface MatchedComponents {
  shape: boolean;
  color: boolean;
  count: boolean;
}

export interface MatchingCard {
  card: GameCard;
  matchedComponents: MatchedComponents;
  isFullyMatched: boolean;
}

interface ComponentMatchingState {
  cards: MatchingCard[];
  matchedCardCount: number;
  totalCards: number;
  isComplete: boolean;
  comboText: string | null;
}

type Action =
  | { type: 'INIT_CARDS'; comboType: ComboType; cardCount: number }
  | { type: 'MATCH_COMPONENT'; cardId: string; componentType: 'shape' | 'color' | 'count' }
  | { type: 'CARD_COMPLETE'; cardId: string }
  | { type: 'COMPLETE' }
  | { type: 'SET_COMBO_TEXT'; text: string | null };

const initialState: ComponentMatchingState = {
  cards: [],
  matchedCardCount: 0,
  totalCards: 20,
  isComplete: false,
  comboText: null,
};

function reducer(state: ComponentMatchingState, action: Action): ComponentMatchingState {
  switch (action.type) {
    case 'INIT_CARDS': {
      const combos = generateTargetCombos(action.cardCount, action.comboType);
      const cards: MatchingCard[] = combos.map((combo, i) => ({
        card: {
          id: `card-${i}`,
          combo,
          state: 'face-up' as const,
        },
        matchedComponents: {
          shape: false,
          color: false,
          // For two-word combos, count is always "matched" (not needed)
          count: combo.type === 'two-word',
        },
        isFullyMatched: false,
      }));
      return {
        ...initialState,
        cards,
        totalCards: cards.length,
      };
    }

    case 'MATCH_COMPONENT': {
      const newCards = state.cards.map(mc => {
        if (mc.card.id !== action.cardId) return mc;
        const newMatched = { ...mc.matchedComponents, [action.componentType]: true };
        const isFullyMatched = newMatched.shape && newMatched.color && newMatched.count;
        return {
          ...mc,
          matchedComponents: newMatched,
          isFullyMatched,
        };
      });
      return { ...state, cards: newCards };
    }

    case 'CARD_COMPLETE': {
      const newCards = state.cards.map(mc => {
        if (mc.card.id !== action.cardId) return mc;
        return {
          ...mc,
          card: { ...mc.card, state: 'matched' as const },
        };
      });
      const newCount = state.matchedCardCount + 1;
      const isComplete = newCount >= state.totalCards;
      return {
        ...state,
        cards: newCards,
        matchedCardCount: newCount,
        isComplete,
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

export function useComponentMatchingState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const initCards = useCallback((comboType: ComboType, cardCount: number = 20) => {
    dispatch({ type: 'INIT_CARDS', comboType, cardCount });
  }, []);

  const attemptMatch = useCallback((
    cardId: string,
    componentType: 'shape' | 'color' | 'count',
    value: ShapeType | ColorType | CountType,
  ): boolean => {
    const matchingCard = state.cards.find(mc => mc.card.id === cardId);
    if (!matchingCard || matchingCard.isFullyMatched || matchingCard.card.state === 'matched') return false;

    // Already matched this component type for this card
    if (matchingCard.matchedComponents[componentType]) return false;

    const combo = matchingCard.card.combo;

    // Check if the component value matches
    let isMatch = false;
    if (componentType === 'shape') {
      isMatch = combo.shape === value;
    } else if (componentType === 'color') {
      isMatch = combo.color === value;
    } else if (componentType === 'count' && combo.type === 'three-word') {
      isMatch = combo.count === value;
    }

    if (isMatch) {
      dispatch({ type: 'MATCH_COMPONENT', cardId, componentType });
    }

    return isMatch;
  }, [state.cards]);

  const completeCard = useCallback((cardId: string) => {
    dispatch({ type: 'CARD_COMPLETE', cardId });
  }, []);

  const setComboText = useCallback((text: string | null) => {
    dispatch({ type: 'SET_COMBO_TEXT', text });
  }, []);

  return {
    state,
    actions: {
      initCards,
      attemptMatch,
      completeCard,
      setComboText,
    },
  };
}
