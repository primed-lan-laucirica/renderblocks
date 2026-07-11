import { useState, useCallback } from 'react';
import type { ScreenSetType, AllProgression, ScreenSetProgression } from '../types';
import { getScreenCount } from '../data/screenSets';

const STORAGE_KEY = 'rendercombos-progression';

interface PersistedProgression {
  version: 1;
  memory: { screenIndex: number; failCount: number; unlocked: boolean };
  building: { screenIndex: number; failCount: number; unlocked: boolean };
  matching: { screenIndex: number; failCount: number; unlocked: boolean };
  spin: { screenIndex: number; failCount: number; unlocked: boolean };
}

const DEFAULT_PROGRESSION: AllProgression = {
  memory: { currentScreenIndex: 0, failCount: 0, unlocked: true },
  building: { currentScreenIndex: 0, failCount: 0, unlocked: true },
  matching: { currentScreenIndex: 0, failCount: 0, unlocked: true },
  spin: { currentScreenIndex: 0, failCount: 0, unlocked: true },
};

function loadFromStorage(): AllProgression {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESSION;

    const data: PersistedProgression = JSON.parse(raw);
    if (data.version !== 1) return DEFAULT_PROGRESSION;

    return {
      memory: {
        currentScreenIndex: data.memory.screenIndex,
        failCount: data.memory.failCount,
        unlocked: true,
      },
      building: {
        currentScreenIndex: data.building.screenIndex,
        failCount: data.building.failCount,
        unlocked: true,
      },
      matching: {
        currentScreenIndex: data.matching.screenIndex,
        failCount: data.matching.failCount,
        unlocked: true,
      },
      spin: {
        currentScreenIndex: data.spin?.screenIndex ?? 0,
        failCount: data.spin?.failCount ?? 0,
        unlocked: true,
      },
    };
  } catch {
    return DEFAULT_PROGRESSION;
  }
}

function saveToStorage(progression: AllProgression): void {
  const data: PersistedProgression = {
    version: 1,
    memory: {
      screenIndex: progression.memory.currentScreenIndex,
      failCount: progression.memory.failCount,
      unlocked: progression.memory.unlocked,
    },
    building: {
      screenIndex: progression.building.currentScreenIndex,
      failCount: progression.building.failCount,
      unlocked: progression.building.unlocked,
    },
    matching: {
      screenIndex: progression.matching.currentScreenIndex,
      failCount: progression.matching.failCount,
      unlocked: progression.matching.unlocked,
    },
    spin: {
      screenIndex: progression.spin.currentScreenIndex,
      failCount: progression.spin.failCount,
      unlocked: progression.spin.unlocked,
    },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Order of screen set unlocking
const UNLOCK_ORDER: ScreenSetType[] = ['memory', 'building', 'matching', 'spin'];

export function useScreenProgression() {
  const [progression, setProgression] = useState<AllProgression>(loadFromStorage);

  const updateProgression = useCallback((setType: ScreenSetType, update: Partial<ScreenSetProgression>) => {
    setProgression(prev => {
      const next = {
        ...prev,
        [setType]: { ...prev[setType], ...update },
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const advanceScreen = useCallback((setType: ScreenSetType) => {
    setProgression(prev => {
      const current = prev[setType];
      const totalScreens = getScreenCount(setType);
      const nextIndex = current.currentScreenIndex + 1;

      const next = { ...prev };

      if (nextIndex >= totalScreens) {
        // Completed all screens in this set — unlock next set
        next[setType] = { ...current, currentScreenIndex: 0, failCount: 0 };

        const currentOrderIndex = UNLOCK_ORDER.indexOf(setType);
        if (currentOrderIndex < UNLOCK_ORDER.length - 1) {
          const nextSetType = UNLOCK_ORDER[currentOrderIndex + 1];
          next[nextSetType] = { ...next[nextSetType], unlocked: true };
        }
      } else {
        // Advance to next screen
        next[setType] = { ...current, currentScreenIndex: nextIndex, failCount: 0 };
      }

      saveToStorage(next);
      return next;
    });
  }, []);

  const recordFailure = useCallback((setType: ScreenSetType) => {
    setProgression(prev => {
      const next = {
        ...prev,
        [setType]: {
          ...prev[setType],
          failCount: prev[setType].failCount + 1,
        },
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const resetProgression = useCallback((setType: ScreenSetType) => {
    setProgression(prev => {
      const next = {
        ...prev,
        [setType]: { ...prev[setType], currentScreenIndex: 0, failCount: 0 },
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  return {
    progression,
    updateProgression,
    advanceScreen,
    recordFailure,
    resetProgression,
  };
}
