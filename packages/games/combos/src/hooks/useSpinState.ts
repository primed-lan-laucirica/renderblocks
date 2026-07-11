import { useReducer, useCallback } from 'react';
import type { Combo, ComboType } from '../types';
import { generateRandomCombo } from '../data/comboGenerator';

export type SpinPhase = 'idle' | 'spinning' | 'revealing' | 'complete';

interface SpinState {
  phase: SpinPhase;
  currentCombo: Combo | null;
  comboType: ComboType;
  reelsStopped: number;
  totalReels: number;
  spunCount: number;
  targetCount: number;
  isComplete: boolean;
  comboText: string | null;
}

type SpinAction =
  | { type: 'INIT_SCREEN'; comboType: ComboType; targetCount: number }
  | { type: 'START_SPIN' }
  | { type: 'REEL_STOPPED' }
  | { type: 'REVEAL_COMPLETE' }
  | { type: 'SET_COMBO_TEXT'; text: string | null };

const initialState: SpinState = {
  phase: 'idle',
  currentCombo: null,
  comboType: 'two-word',
  reelsStopped: 0,
  totalReels: 2,
  spunCount: 0,
  targetCount: 5,
  isComplete: false,
  comboText: null,
};

function reducer(state: SpinState, action: SpinAction): SpinState {
  switch (action.type) {
    case 'INIT_SCREEN':
      return {
        ...initialState,
        comboType: action.comboType,
        targetCount: action.targetCount,
        totalReels: action.comboType === 'three-word' ? 3 : 2,
      };

    case 'START_SPIN': {
      const combo = generateRandomCombo(state.comboType);
      return {
        ...state,
        phase: 'spinning',
        currentCombo: combo,
        reelsStopped: 0,
        comboText: null,
      };
    }

    case 'REEL_STOPPED': {
      const newStopped = state.reelsStopped + 1;
      const allStopped = newStopped >= state.totalReels;
      return {
        ...state,
        reelsStopped: newStopped,
        phase: allStopped ? 'revealing' : state.phase,
      };
    }

    case 'REVEAL_COMPLETE': {
      const newCount = state.spunCount + 1;
      const done = newCount >= state.targetCount;
      return {
        ...state,
        spunCount: newCount,
        phase: done ? 'complete' : 'idle',
        isComplete: done,
        // Keep currentCombo and comboText visible until next spin
      };
    }

    case 'SET_COMBO_TEXT':
      return { ...state, comboText: action.text };

    default:
      return state;
  }
}

export function useSpinState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const initScreen = useCallback((comboType: ComboType, targetCount: number) => {
    dispatch({ type: 'INIT_SCREEN', comboType, targetCount });
  }, []);

  const startSpin = useCallback(() => {
    dispatch({ type: 'START_SPIN' });
  }, []);

  const reelStopped = useCallback(() => {
    dispatch({ type: 'REEL_STOPPED' });
  }, []);

  const revealComplete = useCallback(() => {
    dispatch({ type: 'REVEAL_COMPLETE' });
  }, []);

  const setComboText = useCallback((text: string | null) => {
    dispatch({ type: 'SET_COMBO_TEXT', text });
  }, []);

  return {
    state,
    actions: { initScreen, startSpin, reelStopped, revealComplete, setComboText },
  };
}
