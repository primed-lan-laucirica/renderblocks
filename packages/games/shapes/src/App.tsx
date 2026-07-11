import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { GameProps } from '@renderblocks/kernel';
import { AppShell } from './components/layout';
import { Timer, Celebration, ContentTabs } from './components/ui';
import { PuzzleCanvas } from './components/shapes';
import { ItemPalette } from './components/items';
import { useDarkMode, useTimer, useGameState, loadProgression, saveProgression, toPersistedFormat } from './hooks';
import { getPuzzleWithPositions, getPuzzleIds, getNextPuzzleId } from './data/puzzles';
import { getLetterPuzzleWithPositions, getLetterPuzzleIds, getNextLetterPuzzleId } from './data/letterPuzzles';
import { getNumberPuzzleWithPositions, getNumberPuzzleIds, getNextNumberPuzzleId } from './data/numberPuzzles';
import type { ItemType, Position, ContentClass, Puzzle } from './types';
import { resumeAudioContext, playSnapSound, playWrongSound } from './utils/sounds';

// Snap threshold ratio (8% of smaller viewport dimension)
const SNAP_THRESHOLD_RATIO = 0.08;

// Helper functions to get puzzles by content class
function getPuzzleIdsByClass(contentClass: ContentClass): string[] {
  switch (contentClass) {
    case 'shapes':
      return getPuzzleIds();
    case 'letters':
      return getLetterPuzzleIds();
    case 'numbers':
      return getNumberPuzzleIds();
  }
}

function getPuzzleByClass(
  contentClass: ContentClass,
  puzzleId: string,
  canvasWidth: number,
  canvasHeight: number
): Puzzle | null {
  switch (contentClass) {
    case 'shapes':
      return getPuzzleWithPositions(puzzleId, canvasWidth, canvasHeight);
    case 'letters':
      return getLetterPuzzleWithPositions(puzzleId, canvasWidth, canvasHeight);
    case 'numbers':
      return getNumberPuzzleWithPositions(puzzleId, canvasWidth, canvasHeight);
  }
}

function getNextPuzzleIdByClass(contentClass: ContentClass, currentId: string): string | null {
  switch (contentClass) {
    case 'shapes':
      return getNextPuzzleId(currentId);
    case 'letters':
      return getNextLetterPuzzleId(currentId);
    case 'numbers':
      return getNextNumberPuzzleId(currentId);
  }
}

function App({ services }: GameProps) {
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { state, actions } = useGameState();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showCelebration, setShowCelebration] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeoutTrigger, setTimeoutTrigger] = useState(0);
  const [progressionLoaded, setProgressionLoaded] = useState(false);

  // Calculate responsive item size (8% of smaller screen dimension)
  const itemSize = Math.min(window.innerWidth, window.innerHeight) * 0.08 || 60;

  // Snap threshold for hole detection
  const snapThreshold = Math.min(window.innerWidth, window.innerHeight) * SNAP_THRESHOLD_RATIO;

  // Calculate available items (needed for puzzle but not yet filled)
  const availableItems = useMemo(() => {
    if (!state.currentPuzzle) return new Set<ItemType>();

    const available = new Set<ItemType>();
    for (const hole of state.currentPuzzle.holes) {
      if (!hole.filled) {
        available.add(hole.itemType);
      }
    }
    return available;
  }, [state.currentPuzzle]);

  // Get current fail count for active content class
  const currentFailCount = state.progression[state.activeContentClass].failCount;

  // Timer hook
  const timer = useTimer({
    initialSeconds: state.currentPuzzle?.timeLimit || 60,
    onTick: actions.updateTime,
    onComplete: () => {
      actions.handleTimeout();
      setTimeoutTrigger(t => t + 1);
    },
    autoStart: false,
  });

  // Load progression from localStorage on mount
  useEffect(() => {
    const persisted = loadProgression();
    actions.loadProgression(
      {
        shapes: { currentPuzzleIndex: persisted.shapes.puzzleIndex, failCount: persisted.shapes.failCount },
        letters: { currentPuzzleIndex: persisted.letters.puzzleIndex, failCount: persisted.letters.failCount },
        numbers: { currentPuzzleIndex: persisted.numbers.puzzleIndex, failCount: persisted.numbers.failCount },
      },
      persisted.lastActiveTab
    );
    setProgressionLoaded(true);
  }, []);

  // Save progression whenever it changes
  useEffect(() => {
    if (!progressionLoaded) return;
    const data = toPersistedFormat(
      {
        shapes: {
          currentPuzzleIndex: state.progression.shapes.currentPuzzleIndex,
          failCount: state.progression.shapes.failCount,
        },
        letters: {
          currentPuzzleIndex: state.progression.letters.currentPuzzleIndex,
          failCount: state.progression.letters.failCount,
        },
        numbers: {
          currentPuzzleIndex: state.progression.numbers.currentPuzzleIndex,
          failCount: state.progression.numbers.failCount,
        },
      },
      state.activeContentClass
    );
    saveProgression(data);
  }, [state.progression, state.activeContentClass, progressionLoaded]);

  // Handle timeout restart in effect
  useEffect(() => {
    if (timeoutTrigger === 0) return;

    if (state.currentPuzzle && canvasSize.width > 0) {
      const puzzle = getPuzzleByClass(
        state.activeContentClass,
        state.currentPuzzle.id,
        canvasSize.width,
        canvasSize.height
      );
      if (puzzle) {
        actions.startPuzzle(puzzle);
        timer.reset(puzzle.timeLimit + currentFailCount * 15, true);
      }
    }
  }, [timeoutTrigger]);

  // Measure canvas size
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Check for puzzle completion
  useEffect(() => {
    if (gameStarted && state.isComplete && state.currentPuzzle) {
      timer.pause();
      setShowCelebration(true);
    }
  }, [gameStarted, state.isComplete, state.currentPuzzle, timer]);

  // Prevent all unwanted touch gestures
  useEffect(() => {
    const preventGestures = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventGestureEvent = (e: Event) => {
      e.preventDefault();
    };

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

  // Hardware back: leave an in-progress round for the start menu; from the
  // start menu, let the kernel take us to the game-select home screen.
  useEffect(() => {
    return services.onBack(() => {
      if (gameStarted) {
        timer.pause();
        setGameStarted(false);
        setShowCelebration(false);
        return true;
      }
      return false;
    });
  }, [services, gameStarted, timer]);

  // Start the game with the appropriate puzzle for the active content class
  const startGame = useCallback(() => {
    resumeAudioContext();
    const contentClass = state.activeContentClass;
    const puzzleIds = getPuzzleIdsByClass(contentClass);
    const puzzleIndex = state.progression[contentClass].currentPuzzleIndex;

    // If we've completed all puzzles, start from beginning
    const actualIndex = puzzleIndex < puzzleIds.length ? puzzleIndex : 0;

    if (puzzleIds.length > 0 && canvasSize.width > 0) {
      const puzzle = getPuzzleByClass(contentClass, puzzleIds[actualIndex], canvasSize.width, canvasSize.height);
      if (puzzle) {
        actions.startPuzzle(puzzle);
        const failCount = state.progression[contentClass].failCount;
        timer.reset(puzzle.timeLimit + failCount * 15, true);
        setGameStarted(true);
      }
    }
  }, [canvasSize, actions, timer, state.activeContentClass, state.progression]);

  // Handle tab change
  const handleTabChange = useCallback((tab: ContentClass) => {
    if (tab === state.activeContentClass) return;

    // If game is in progress, stop timer and reset game state
    if (gameStarted) {
      timer.pause();
      setGameStarted(false);
    }

    actions.switchTab(tab);
  }, [actions, timer, gameStarted, state.activeContentClass]);

  // Handle celebration complete - advance to next puzzle
  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);

    if (state.currentPuzzle) {
      const contentClass = state.activeContentClass;
      const nextId = getNextPuzzleIdByClass(contentClass, state.currentPuzzle.id);
      if (nextId) {
        const puzzle = getPuzzleByClass(contentClass, nextId, canvasSize.width, canvasSize.height);
        if (puzzle) {
          actions.nextPuzzle(puzzle);
          const failCount = state.progression[contentClass].failCount;
          timer.reset(puzzle.timeLimit + failCount * 15, true);
        }
      } else {
        // All puzzles complete for this content class - reset and go to start screen
        actions.reset();
        setGameStarted(false);
      }
    }
  }, [state.currentPuzzle, state.activeContentClass, state.progression, canvasSize, actions, timer]);

  // Handle item drop from palette
  const handleItemDrop = useCallback(
    (itemType: ItemType, screenPosition: Position) => {
      if (!canvasRef.current || !state.currentPuzzle) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const canvasPosition = {
        x: screenPosition.x - rect.left,
        y: screenPosition.y - rect.top,
      };

      // Check for hole match on initial drop
      for (const hole of state.currentPuzzle.holes) {
        const distance = Math.sqrt(
          Math.pow(canvasPosition.x - hole.position.x, 2) +
          Math.pow(canvasPosition.y - hole.position.y, 2)
        );

        if (distance < snapThreshold) {
          if (hole.filled) {
            playWrongSound();
            return;
          } else if (hole.itemType === itemType) {
            playSnapSound();
            actions.fillHole(hole.id);
            return;
          } else {
            playWrongSound();
            return;
          }
        }
      }

      // No hole nearby - spawn piece at drop position
      actions.spawnPiece(itemType, canvasPosition);
    },
    [state.currentPuzzle, snapThreshold, actions]
  );

  // Render start screen if game hasn't started
  if (!gameStarted || !state.currentPuzzle) {
    return (
      <AppShell
        header={
          <div className="flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-3">
              <motion.img
                src="/games/shapes/logo.png"
                alt="RenderShapes"
                className="w-10 h-10 rounded-lg"
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <span className={`text-xl font-bold hidden sm:inline ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                RenderShapes
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
        footer={
          <ContentTabs
            activeTab={state.activeContentClass}
            onTabChange={handleTabChange}
          />
        }
      >
        <div
          ref={canvasRef}
          className="relative w-full h-full overflow-hidden flex items-center justify-center"
          style={{ touchAction: 'none' }}
        >
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="flex justify-center gap-4 mb-8"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {state.activeContentClass === 'shapes' && (
                <>
                  <div className="w-16 h-16 bg-red-500 rounded-full" />
                  <div className="w-16 h-16 bg-green-500" />
                  <div
                    className="w-0 h-0"
                    style={{
                      borderLeft: '32px solid transparent',
                      borderRight: '32px solid transparent',
                      borderBottom: '64px solid #8B00FF',
                    }}
                  />
                </>
              )}
              {state.activeContentClass === 'letters' && (
                <>
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">A</div>
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">B</div>
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">C</div>
                </>
              )}
              {state.activeContentClass === 'numbers' && (
                <>
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">1</div>
                  <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">2</div>
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">3</div>
                </>
              )}
            </motion.div>
            <h1 className={`text-3xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              RenderShapes
            </h1>
            <p className={`text-lg mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {state.activeContentClass === 'shapes' && 'Drag shapes to fill the puzzle!'}
              {state.activeContentClass === 'letters' && 'Drag letters to fill the puzzle!'}
              {state.activeContentClass === 'numbers' && 'Drag numbers to fill the puzzle!'}
            </p>
            <motion.button
              onClick={startGame}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold rounded-full shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={canvasSize.width === 0}
            >
              Start Game
            </motion.button>
          </motion.div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between pointer-events-none">
          {/* Logo and app name */}
          <div className="flex items-center gap-3">
            <motion.img
              src="/games/shapes/logo.png"
              alt="RenderShapes"
              className="w-10 h-10 rounded-lg"
              animate={{ rotate: [0, 2, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <span className={`text-xl font-bold hidden sm:inline ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              RenderShapes
            </span>
          </div>

          {/* Timer */}
          <div className="pointer-events-auto">
            <Timer seconds={timer.seconds} />
          </div>

          {/* Dark mode toggle */}
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
      footer={
        <ItemPalette
          contentClass={state.activeContentClass}
          onItemDrop={handleItemDrop}
          itemSize={itemSize}
          availableItems={availableItems}
          disabled={state.isComplete}
        />
      }
    >
      {/* Main puzzle area */}
      <div
        ref={canvasRef}
        className="relative w-full h-full overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <PuzzleCanvas
          puzzle={state.currentPuzzle}
          pieces={state.pieces}
          onPieceMove={actions.movePiece}
          onPieceRemove={actions.removePiece}
          onHoleFilled={actions.fillHole}
          shapeSize={itemSize}
        />
      </div>

      {/* Celebration overlay */}
      <Celebration
        isActive={showCelebration}
        onComplete={handleCelebrationComplete}
      />
    </AppShell>
  );
}

export default App;
