import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScreenDefinition } from '../../../types';
import { getComboLabel } from '../../../types';
import { useMemoryMatchingState } from '../../../hooks/useMemoryMatchingState';
import { useTimer } from '../../../hooks/useTimer';
import { CardGrid } from '../../cards';
import { Timer, Celebration } from '../../ui';
import { playComboSound, playHooraySound, playWrongSound, resumeAudioContext } from '../../../utils/sounds';

interface MemoryMatchingGameProps {
  screen: ScreenDefinition;
  failCount: number;
  onComplete: () => void;
  onTimeout: () => void;
  onBack: () => void;
  isDark: boolean;
}

export function MemoryMatchingGame({
  screen,
  failCount,
  onComplete,
  onTimeout,
  onBack,
  isDark,
}: MemoryMatchingGameProps) {
  const { state, actions } = useMemoryMatchingState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showCelebration, setShowCelebration] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const timeBonus = failCount * 15;
  const targetCount = screen.targetCount ?? 20;
  const pairCount = targetCount / 2;

  const timer = useTimer({
    initialSeconds: screen.timeLimit + timeBonus,
    onComplete: () => {
      onTimeout();
    },
    autoStart: false,
  });

  const isFaceUp = screen.faceUp === true;

  // Initialize cards and start timer
  useEffect(() => {
    resumeAudioContext();
    actions.initCards(screen.comboType, pairCount, isFaceUp);
    setInitialized(true);
  }, [screen.id]);

  // Start timer once cards are initialized
  useEffect(() => {
    if (initialized && state.cards.length > 0) {
      timer.reset(screen.timeLimit + timeBonus, true);
    }
  }, [initialized, state.cards.length > 0]);

  // Measure container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Check for match when two cards are flipped
  useEffect(() => {
    if (state.flippedCardIds.length === 2) {
      const isMatch = actions.checkMatch();
      if (isMatch) {
        playHooraySound();
      } else {
        playWrongSound();
      }
    }
  }, [state.flippedCardIds.length]);

  // Handle completion
  useEffect(() => {
    if (state.isComplete) {
      timer.pause();
      setShowCelebration(true);
    }
  }, [state.isComplete]);

  // Handle card click
  const handleCardClick = useCallback((cardId: string) => {
    if (state.isProcessing || state.isComplete) return;
    if (state.flippedCardIds.length >= 2) return;

    const card = state.cards.find(c => c.id === cardId);
    if (!card) return;

    // In face-up mode allow selecting visible cards; otherwise only face-down
    const allowedState = isFaceUp ? 'face-up' : 'face-down';
    if (card.state !== allowedState) return;

    actions.flipCard(cardId);

    // Play combo sound and show text
    playComboSound(card.combo);
    actions.setComboText(getComboLabel(card.combo));
  }, [state.isProcessing, state.isComplete, state.flippedCardIds.length, state.cards, actions, isFaceUp]);

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
    onComplete();
  }, [onComplete]);

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 pointer-events-none z-10">
        <button
          onClick={onBack}
          className={`pointer-events-auto p-2 rounded-full transition-colors ${
            isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="pointer-events-auto">
          <Timer seconds={timer.seconds} />
        </div>

        <div className="w-9" /> {/* Spacer for alignment */}
      </div>

      {/* Combo text display */}
      <div className="h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {state.comboText && (
            <motion.div
              key={state.comboText}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}
            >
              {state.comboText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card grid */}
      <div ref={containerRef} className="flex-1 p-2 min-h-0 overflow-hidden">
        {containerSize.width > 0 && state.cards.length > 0 && (
          <CardGrid
            cards={state.cards}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            onCardClick={handleCardClick}
            allFaceUp={isFaceUp}
            selectedCardIds={state.flippedCardIds}
          />
        )}
      </div>

      {/* Celebration overlay */}
      <Celebration
        isActive={showCelebration}
        onComplete={handleCelebrationComplete}
      />
    </div>
  );
}
