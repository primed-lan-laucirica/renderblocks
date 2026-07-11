import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '@renderblocks/kernel';
import { AppShell } from './components/layout';
import { useDarkMode } from './hooks';
import { useScreenProgression } from './hooks/useScreenProgression';
import { MemoryMatchingGame } from './components/games/memory';
import { CardBuildingGame } from './components/games/building';
import { ComponentMatchingGame } from './components/games/matching';
import { SpinGame } from './components/games/spin';
import { getScreen } from './data/screenSets';
import { resumeAudioContext } from './utils/sounds';
import type { ScreenSetType } from './types';

type GameView =
  | { type: 'start' }
  | { type: 'playing'; screenSet: ScreenSetType };

function App({ services }: GameProps) {
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { progression, advanceScreen, recordFailure } = useScreenProgression();
  const [view, setView] = useState<GameView>({ type: 'start' });

  // Hardware back: leave an in-progress screen for the start menu; from the
  // start menu, let the kernel take us to the game-select home screen.
  useEffect(() => {
    return services.onBack(() => {
      if (view.type === 'playing') {
        setView({ type: 'start' });
        return true;
      }
      return false;
    });
  }, [services, view.type]);

  // Prevent unwanted touch gestures
  useEffect(() => {
    const preventGestures = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    const preventGestureEvent = (e: Event) => e.preventDefault();

    document.addEventListener('touchmove', preventGestures, { passive: false });
    document.addEventListener('gesturestart', preventGestureEvent);
    document.addEventListener('gesturechange', preventGestureEvent);
    document.addEventListener('gestureend', preventGestureEvent);

    return () => {
      document.removeEventListener('touchmove', preventGestures);
      document.removeEventListener('gesturestart', preventGestureEvent);
      document.removeEventListener('gesturechange', preventGestureEvent);
      document.removeEventListener('gestureend', preventGestureEvent);
    };
  }, []);

  const startGame = useCallback((screenSet: ScreenSetType) => {
    resumeAudioContext();
    setView({ type: 'playing', screenSet });
  }, []);

  const handleBack = useCallback(() => {
    setView({ type: 'start' });
  }, []);

  const handleScreenComplete = useCallback((screenSet: ScreenSetType) => {
    advanceScreen(screenSet);
    // Check if there's a next screen — if so, stay in game, otherwise go to start
    const nextIndex = progression[screenSet].currentScreenIndex + 1;
    const nextScreen = getScreen(screenSet, nextIndex);
    if (!nextScreen) {
      // All screens complete — return to start
      setView({ type: 'start' });
    }
    // If there is a next screen, the component will re-render with updated progression
  }, [advanceScreen, progression]);

  const handleTimeout = useCallback((screenSet: ScreenSetType) => {
    recordFailure(screenSet);
    // Stay in game — component will restart with new time bonus
  }, [recordFailure]);

  // --- Render game screen ---
  if (view.type === 'playing') {
    const screenSet = view.screenSet;
    const prog = progression[screenSet];
    const screen = getScreen(screenSet, prog.currentScreenIndex);

    if (!screen) {
      // No screen available — shouldn't happen, go back to start
      setView({ type: 'start' });
      return null;
    }

    if (screenSet === 'memory') {
      return (
        <MemoryMatchingGame
          key={`${screen.id}-${prog.failCount}`}
          screen={screen}
          failCount={prog.failCount}
          onComplete={() => handleScreenComplete(screenSet)}
          onTimeout={() => handleTimeout(screenSet)}
          onBack={handleBack}
          isDark={isDark}
        />
      );
    }

    if (screenSet === 'building') {
      return (
        <CardBuildingGame
          key={`${screen.id}-${prog.failCount}`}
          screen={screen}
          failCount={prog.failCount}
          onComplete={() => handleScreenComplete(screenSet)}
          onTimeout={() => handleTimeout(screenSet)}
          onBack={handleBack}
          isDark={isDark}
        />
      );
    }

    if (screenSet === 'spin') {
      return (
        <SpinGame
          key={`${screen.id}-${prog.failCount}`}
          screen={screen}
          failCount={prog.failCount}
          onComplete={() => handleScreenComplete(screenSet)}
          onTimeout={() => handleTimeout(screenSet)}
          onBack={handleBack}
          isDark={isDark}
        />
      );
    }

    // Component Matching
    return (
      <ComponentMatchingGame
        key={`${screen.id}-${prog.failCount}`}
        screen={screen}
        failCount={prog.failCount}
        onComplete={() => handleScreenComplete(screenSet)}
        onTimeout={() => handleTimeout(screenSet)}
        onBack={handleBack}
        isDark={isDark}
      />
    );
  }

  // --- Render start screen ---
  const screenSets: { type: ScreenSetType; label: string; icon: string }[] = [
    { type: 'memory', label: 'Memory Matching', icon: '🧠' },
    { type: 'building', label: 'Card Building', icon: '🔨' },
    { type: 'matching', label: 'Component Matching', icon: '🧩' },
    { type: 'spin', label: 'Combo Spin', icon: '🎰' },
  ];

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3">
            <motion.img
              src="/games/combos/logo.png"
              alt="RenderCombos"
              className="w-10 h-10 rounded-lg"
              animate={{ rotate: [0, 2, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <span className={`text-xl font-bold hidden sm:inline ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              RenderCombos
            </span>
          </div>
          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-colors ${
                isDark
                  ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 15a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm9-9a1 1 0 110 2h-1a1 1 0 110-2h1zM5 11a1 1 0 110 2H4a1 1 0 110-2h1zm14.071-6.071a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM6.05 16.536a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zm12.021.707a1 1 0 01-1.414 0l-.707-.707a1 1 0 111.414-1.414l.707.707a1 1 0 010 1.414zM5.636 6.05a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM12 8a4 4 0 100 8 4 4 0 000-8z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex items-center justify-center w-full h-full">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.img
            src="/games/combos/logo.png"
            alt="RenderCombos"
            className="w-28 h-28 landscape:w-16 landscape:h-16 mx-auto mb-4 landscape:mb-2 rounded-2xl shadow-lg"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <h1 className={`text-3xl landscape:text-2xl font-bold mb-6 landscape:mb-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            RenderCombos
          </h1>

          <div className="grid grid-cols-1 landscape:grid-cols-2 gap-4">
            {screenSets.map(({ type, label, icon }) => {
              const prog = progression[type];
              const isUnlocked = prog.unlocked;
              const screenInfo = getScreen(type, prog.currentScreenIndex);

              return (
                <motion.button
                  key={type}
                  onClick={() => isUnlocked && startGame(type)}
                  className={`px-8 py-4 rounded-2xl text-lg font-bold shadow-lg transition-colors flex items-center gap-3 ${
                    isUnlocked
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white cursor-pointer'
                      : `${isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-400'} cursor-not-allowed`
                  }`}
                  whileHover={isUnlocked ? { scale: 1.03 } : undefined}
                  whileTap={isUnlocked ? { scale: 0.97 } : undefined}
                  disabled={!isUnlocked}
                >
                  <span className="text-2xl">{isUnlocked ? icon : '🔒'}</span>
                  <div className="text-left">
                    <div>{label}</div>
                    {isUnlocked && screenInfo && (
                      <div className="text-sm opacity-75">
                        {screenInfo.name}
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}

export default App;
