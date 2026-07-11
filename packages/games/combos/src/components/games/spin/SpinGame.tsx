import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScreenDefinition } from '../../../types';
import { ALL_SHAPES, ALL_COLORS, ALL_COUNTS, COLOR_HEX, getComboLabel } from '../../../types';
import { useSpinState } from '../../../hooks/useSpinState';
import { Celebration } from '../../ui';
import { CardFace } from '../../cards/CardFace';
import { ShapeRenderer } from '../../shapes';
import { SlotReel } from './SlotReel';
import {
  playComboSound,
  playHooraySound,
  resumeAudioContext,
} from '../../../utils/sounds';

interface SpinGameProps {
  screen: ScreenDefinition;
  failCount: number;
  onComplete: () => void;
  onTimeout: () => void;
  onBack: () => void;
  isDark: boolean;
}

export function SpinGame({
  screen,
  onComplete,
  onBack,
  isDark,
}: SpinGameProps) {
  const { state, actions } = useSpinState();
  const [showCelebration, setShowCelebration] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const targetCount = screen.targetCount ?? 5;
  const isThreeWord = screen.comboType === 'three-word';

  // Initialize
  useEffect(() => {
    resumeAudioContext();
    actions.initScreen(screen.comboType, targetCount);
  }, [screen.id]);

  // Build reel items
  const colorItems = useMemo(() =>
    ALL_COLORS.map(c => ({
      value: c,
      display: (
        <div
          className="w-8 h-8 rounded-full border-2 border-gray-200"
          style={{ backgroundColor: COLOR_HEX[c] }}
        />
      ),
    })),
  []);

  const shapeItems = useMemo(() =>
    ALL_SHAPES.map(s => ({
      value: s,
      display: <ShapeRenderer shapeType={s} size={32} color="#666" />,
    })),
  []);

  const countItems = useMemo(() =>
    ALL_COUNTS.map(n => ({
      value: String(n),
      display: (
        <span className="text-2xl font-black text-gray-700">
          {n}
        </span>
      ),
    })),
  []);

  // Find selected indices from current combo
  const colorIndex = state.currentCombo
    ? ALL_COLORS.indexOf(state.currentCombo.color)
    : 0;
  const shapeIndex = state.currentCombo
    ? ALL_SHAPES.indexOf(state.currentCombo.shape)
    : 0;
  const countIndex = state.currentCombo && state.currentCombo.type === 'three-word'
    ? ALL_COUNTS.indexOf(state.currentCombo.count)
    : 0;

  const handleReelStop = useCallback(() => {
    actions.reelStopped();
  }, [actions]);

  // When all reels stopped (phase becomes 'revealing'), play combo audio and show card
  useEffect(() => {
    if (state.phase === 'revealing' && state.currentCombo) {
      const combo = state.currentCombo;
      actions.setComboText(getComboLabel(combo));

      // Small delay then play full combo audio
      const comboTimer = setTimeout(() => {
        playComboSound(combo);
      }, 400);

      // Count this spin, but keep card+text visible until next spin
      revealTimerRef.current = setTimeout(() => {
        actions.revealComplete();
      }, 1500);

      return () => {
        clearTimeout(comboTimer);
        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      };
    }
  }, [state.phase]);

  // Handle completion — cheer only on screen completion
  useEffect(() => {
    if (state.isComplete) {
      playHooraySound();
      setShowCelebration(true);
    }
  }, [state.isComplete]);

  const handleSpin = useCallback(() => {
    if (state.phase !== 'idle') return;
    resumeAudioContext();
    actions.startSpin();
  }, [state.phase, actions]);

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
    onComplete();
  }, [onComplete]);

  const isSpinning = state.phase === 'spinning' || state.phase === 'revealing';
  const showCard = state.currentCombo && state.phase !== 'spinning';

  const itemHeight = 56;

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

        <span className={`text-lg font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {state.spunCount} / {state.targetCount}
        </span>
      </div>

      {/* Main content — text, card, reels, button grouped together in center */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4 gap-3">
        {/* Combo text directly above card */}
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

        {/* Card display */}
        {showCard && state.currentCombo ? (
          <CardFace
            combo={state.currentCombo}
            width={160}
            height={213}
          />
        ) : (
          <div
            className="rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
            style={{ width: 160, height: 213 }}
          >
            <span className="text-4xl text-gray-300">?</span>
          </div>
        )}

        {/* Slot reels */}
        <div className="flex items-center justify-center gap-3">
          {isThreeWord && (
            <SlotReel
              items={countItems}
              selectedIndex={countIndex}
              spinning={state.phase === 'spinning'}
              onStop={handleReelStop}
              stopDelay={1500}
              label="Count"
              itemHeight={itemHeight}
            />
          )}
          <SlotReel
            items={colorItems}
            selectedIndex={colorIndex}
            spinning={state.phase === 'spinning'}
            onStop={handleReelStop}
            stopDelay={isThreeWord ? 2000 : 1500}
            label="Color"
            itemHeight={itemHeight}
          />
          <SlotReel
            items={shapeItems}
            selectedIndex={shapeIndex}
            spinning={state.phase === 'spinning'}
            onStop={handleReelStop}
            stopDelay={isThreeWord ? 2500 : 2000}
            label="Shape"
            itemHeight={itemHeight}
          />
        </div>

        {/* SPIN button */}
        <motion.button
          onClick={handleSpin}
          disabled={isSpinning || state.isComplete}
          className={`px-12 py-4 rounded-2xl text-2xl font-black shadow-lg transition-colors ${
            isSpinning || state.isComplete
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white cursor-pointer'
          }`}
          whileHover={!isSpinning && !state.isComplete ? { scale: 1.05 } : undefined}
          whileTap={!isSpinning && !state.isComplete ? { scale: 0.95 } : undefined}
          style={{ touchAction: 'manipulation' }}
        >
          SPIN
        </motion.button>
      </div>

      {/* Celebration overlay */}
      <Celebration
        isActive={showCelebration}
        onComplete={handleCelebrationComplete}
      />
    </div>
  );
}
