import { useReducer, useCallback } from 'react';
import type { ShapeType, ColorType, CountType } from '../types';

interface CardBuildingState {
  selectedShape: ShapeType | null;
  selectedColor: ColorType | null;
  selectedCount: CountType | null;
  builtCount: number;
  targetCount: number;
  paletteCount: 2 | 3;
  isCardComplete: boolean;
  isComplete: boolean;
  comboText: string | null;
}

type Action =
  | { type: 'INIT_SCREEN'; targetCount: number; paletteCount: 2 | 3 }
  | { type: 'PLACE_SHAPE'; shape: ShapeType }
  | { type: 'PLACE_COLOR'; color: ColorType }
  | { type: 'PLACE_COUNT'; count: CountType }
  | { type: 'CYCLE_CARD' }
  | { type: 'SET_COMBO_TEXT'; text: string | null };

const initialState: CardBuildingState = {
  selectedShape: null,
  selectedColor: null,
  selectedCount: null,
  builtCount: 0,
  targetCount: 5,
  paletteCount: 2,
  isCardComplete: false,
  isComplete: false,
  comboText: null,
};

function buildComboText(
  shape: ShapeType | null,
  color: ColorType | null,
  count: CountType | null,
): string {
  const parts: string[] = [];
  if (count !== null) {
    const countWords: Record<number, string> = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five' };
    parts.push(countWords[count]);
  }
  if (color !== null) {
    parts.push(color.charAt(0).toUpperCase() + color.slice(1));
  }
  if (shape !== null) {
    const shapeName = shape.charAt(0).toUpperCase() + shape.slice(1);
    // Pluralize if count > 1
    if (count !== null && count > 1) {
      const plurals: Record<string, string> = {
        cross: 'Crosses',
      };
      parts.push(plurals[shape] || shapeName + 's');
    } else {
      parts.push(shapeName);
    }
  }
  return parts.join(' ') || '';
}

function checkCardComplete(
  shape: ShapeType | null,
  color: ColorType | null,
  count: CountType | null,
  paletteCount: 2 | 3,
): boolean {
  if (paletteCount === 2) {
    return shape !== null && color !== null;
  }
  return shape !== null && color !== null && count !== null;
}

function reducer(state: CardBuildingState, action: Action): CardBuildingState {
  switch (action.type) {
    case 'INIT_SCREEN':
      return {
        ...initialState,
        targetCount: action.targetCount,
        paletteCount: action.paletteCount,
      };

    case 'PLACE_SHAPE': {
      if (state.selectedShape !== null || state.isCardComplete) return state;
      const newShape = action.shape;
      const isComplete = checkCardComplete(newShape, state.selectedColor, state.selectedCount, state.paletteCount);
      const text = buildComboText(newShape, state.selectedColor, state.selectedCount);
      return {
        ...state,
        selectedShape: newShape,
        isCardComplete: isComplete,
        comboText: text,
      };
    }

    case 'PLACE_COLOR': {
      if (state.selectedColor !== null || state.isCardComplete) return state;
      const newColor = action.color;
      const isComplete = checkCardComplete(state.selectedShape, newColor, state.selectedCount, state.paletteCount);
      const text = buildComboText(state.selectedShape, newColor, state.selectedCount);
      return {
        ...state,
        selectedColor: newColor,
        isCardComplete: isComplete,
        comboText: text,
      };
    }

    case 'PLACE_COUNT': {
      if (state.selectedCount !== null || state.isCardComplete) return state;
      const newCount = action.count;
      const isComplete = checkCardComplete(state.selectedShape, state.selectedColor, newCount, state.paletteCount);
      const text = buildComboText(state.selectedShape, state.selectedColor, newCount);
      return {
        ...state,
        selectedCount: newCount,
        isCardComplete: isComplete,
        comboText: text,
      };
    }

    case 'CYCLE_CARD': {
      const newBuilt = state.builtCount + 1;
      const allDone = newBuilt >= state.targetCount;
      return {
        ...state,
        selectedShape: null,
        selectedColor: null,
        selectedCount: null,
        isCardComplete: false,
        builtCount: newBuilt,
        isComplete: allDone,
        comboText: null,
      };
    }

    case 'SET_COMBO_TEXT':
      return { ...state, comboText: action.text };

    default:
      return state;
  }
}

export function useCardBuildingState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const initScreen = useCallback((targetCount: number, paletteCount: 2 | 3) => {
    dispatch({ type: 'INIT_SCREEN', targetCount, paletteCount });
  }, []);

  const placeShape = useCallback((shape: ShapeType) => {
    dispatch({ type: 'PLACE_SHAPE', shape });
  }, []);

  const placeColor = useCallback((color: ColorType) => {
    dispatch({ type: 'PLACE_COLOR', color });
  }, []);

  const placeCount = useCallback((count: CountType) => {
    dispatch({ type: 'PLACE_COUNT', count });
  }, []);

  const cycleCard = useCallback(() => {
    dispatch({ type: 'CYCLE_CARD' });
  }, []);

  const setComboText = useCallback((text: string | null) => {
    dispatch({ type: 'SET_COMBO_TEXT', text });
  }, []);

  return {
    state,
    actions: {
      initScreen,
      placeShape,
      placeColor,
      placeCount,
      cycleCard,
      setComboText,
    },
  };
}
