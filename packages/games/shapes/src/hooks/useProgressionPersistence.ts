import { useEffect, useCallback } from 'react';
import type { ContentClass, ContentProgression } from '../types';

const STORAGE_KEY = 'rendershapes-progression';

export interface PersistedProgression {
  version: 1;
  shapes: { puzzleIndex: number; failCount: number };
  letters: { puzzleIndex: number; failCount: number };
  numbers: { puzzleIndex: number; failCount: number };
  lastActiveTab: ContentClass;
}

const DEFAULT_PROGRESSION: PersistedProgression = {
  version: 1,
  shapes: { puzzleIndex: 0, failCount: 0 },
  letters: { puzzleIndex: 0, failCount: 0 },
  numbers: { puzzleIndex: 0, failCount: 0 },
  lastActiveTab: 'shapes',
};

// Load progression from localStorage
export function loadProgression(): PersistedProgression {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate version and structure
      if (parsed.version === 1 && parsed.shapes && parsed.letters && parsed.numbers) {
        return parsed as PersistedProgression;
      }
    }
  } catch (e) {
    console.warn('Failed to load progression from localStorage:', e);
  }
  return DEFAULT_PROGRESSION;
}

// Save progression to localStorage
export function saveProgression(data: PersistedProgression): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save progression to localStorage:', e);
  }
}

// Convert progression record to persisted format
export function toPersistedFormat(
  progression: Record<ContentClass, ContentProgression>,
  lastActiveTab: ContentClass
): PersistedProgression {
  return {
    version: 1,
    shapes: { puzzleIndex: progression.shapes.currentPuzzleIndex, failCount: progression.shapes.failCount },
    letters: { puzzleIndex: progression.letters.currentPuzzleIndex, failCount: progression.letters.failCount },
    numbers: { puzzleIndex: progression.numbers.currentPuzzleIndex, failCount: progression.numbers.failCount },
    lastActiveTab,
  };
}

// Convert persisted format to progression record
export function fromPersistedFormat(
  persisted: PersistedProgression
): {
  progression: Record<ContentClass, ContentProgression>;
  lastActiveTab: ContentClass;
} {
  return {
    progression: {
      shapes: { currentPuzzleIndex: persisted.shapes.puzzleIndex, failCount: persisted.shapes.failCount },
      letters: { currentPuzzleIndex: persisted.letters.puzzleIndex, failCount: persisted.letters.failCount },
      numbers: { currentPuzzleIndex: persisted.numbers.puzzleIndex, failCount: persisted.numbers.failCount },
    },
    lastActiveTab: persisted.lastActiveTab,
  };
}

// Hook for managing progression persistence
export function useProgressionPersistence(
  progression: Record<ContentClass, ContentProgression>,
  activeContentClass: ContentClass,
  onLoad: (
    progression: Record<ContentClass, ContentProgression>,
    lastActiveTab: ContentClass
  ) => void
) {
  // Load on mount
  useEffect(() => {
    const persisted = loadProgression();
    const { progression: loadedProgression, lastActiveTab } = fromPersistedFormat(persisted);
    onLoad(loadedProgression, lastActiveTab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save function
  const save = useCallback(() => {
    const data = toPersistedFormat(progression, activeContentClass);
    saveProgression(data);
  }, [progression, activeContentClass]);

  return { save };
}

export default useProgressionPersistence;
