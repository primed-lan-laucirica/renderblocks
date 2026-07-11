import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScreenDefinition, ShapeType, ColorType, CountType, Combo, TwoWordCombo, ThreeWordCombo } from '../../../types';
import { useCardBuildingState } from '../../../hooks/useCardBuildingState';
import { useTimer } from '../../../hooks/useTimer';
import { ComponentPalette } from '../shared/ComponentPalette';
import { PaletteGroup } from '../shared/PaletteGroup';
import { BuildingCanvas } from './BuildingCanvas';
import { Timer, Celebration } from '../../ui';
import {
  playComboSound,
  playHooraySound,
  resumeAudioContext,
} from '../../../utils/sounds';

interface CardBuildingGameProps {
  screen: ScreenDefinition;
  failCount: number;
  onComplete: () => void;
  onTimeout: () => void;
  onBack: () => void;
  isDark: boolean;
}

export function CardBuildingGame({
  screen,
  failCount,
  onComplete,
  onTimeout,
  onBack,
  isDark,
}: CardBuildingGameProps) {
  const { state, actions } = useCardBuildingState();
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const [showCelebration, setShowCelebration] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [itemSize, setItemSize] = useState(32);

  const timeBonus = failCount * 15;
  const paletteCount = (screen.paletteCount ?? 2) as 2 | 3;
  const targetCount = screen.targetCount ?? 5;

  const timer = useTimer({
    initialSeconds: screen.timeLimit + timeBonus,
    onComplete: () => {
      onTimeout();
    },
    autoStart: false,
  });

  // Initialize
  useEffect(() => {
    resumeAudioContext();
    actions.initScreen(targetCount, paletteCount);
    setInitialized(true);
  }, [screen.id]);

  // Start timer once initialized
  useEffect(() => {
    if (initialized) {
      timer.reset(screen.timeLimit + timeBonus, true);
    }
  }, [initialized]);

  // Measure available space for the card
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Card uses 3:4 aspect ratio, fit within available space
        const maxWidth = rect.width * 0.6;
        const maxHeight = rect.height * 0.85;
        let w = maxWidth;
        let h = w * (4 / 3);
        if (h > maxHeight) {
          h = maxHeight;
          w = h * (3 / 4);
        }
        setCardSize({ width: Math.floor(w), height: Math.floor(h) });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle card completion — play combo sound, then cycle
  useEffect(() => {
    if (state.isCardComplete && !state.isComplete) {
      // Build the full combo for audio
      const combo = buildCombo(state.selectedShape!, state.selectedColor!, state.selectedCount, paletteCount);
      if (combo) {
        playComboSound(combo);
        playHooraySound();
      }

      // Cycle to next card after a brief pause
      const cycleTimer = setTimeout(() => {
        actions.cycleCard();
      }, 1800);

      return () => clearTimeout(cycleTimer);
    }
  }, [state.isCardComplete]);

  // Handle game completion
  useEffect(() => {
    if (state.isComplete) {
      timer.pause();
      setShowCelebration(true);
    }
  }, [state.isComplete]);

  // Check if drop point is within the card canvas
  const isDropOnCanvas = useCallback((dropPoint: { x: number; y: number }) => {
    if (!canvasRef.current) return false;
    const rect = canvasRef.current.getBoundingClientRect();
    return (
      dropPoint.x >= rect.left &&
      dropPoint.x <= rect.right &&
      dropPoint.y >= rect.top &&
      dropPoint.y <= rect.bottom
    );
  }, []);

  const handleShapeDrop = useCallback((value: ShapeType | ColorType | CountType, dropPoint: { x: number; y: number }) => {
    if (state.isCardComplete || state.isComplete) return;
    if (!isDropOnCanvas(dropPoint)) return;
    actions.placeShape(value as ShapeType);
  }, [state.isCardComplete, state.isComplete, isDropOnCanvas, actions]);

  const handleColorDrop = useCallback((value: ShapeType | ColorType | CountType, dropPoint: { x: number; y: number }) => {
    if (state.isCardComplete || state.isComplete) return;
    if (!isDropOnCanvas(dropPoint)) return;
    actions.placeColor(value as ColorType);
  }, [state.isCardComplete, state.isComplete, isDropOnCanvas, actions]);

  const handleCountDrop = useCallback((value: ShapeType | ColorType | CountType, dropPoint: { x: number; y: number }) => {
    if (state.isCardComplete || state.isComplete) return;
    if (!isDropOnCanvas(dropPoint)) return;
    actions.placeCount(value as CountType);
  }, [state.isCardComplete, state.isComplete, isDropOnCanvas, actions]);

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

        <div className={`pointer-events-auto px-3 py-1 rounded-full text-sm font-bold ${
          isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'
        }`}>
          {state.builtCount} / {state.targetCount}
        </div>
      </div>

      {/* Combo text display */}
      <div className="h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {state.comboText && (
            <motion.div
              key={state.comboText}
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: state.isCardComplete ? [1, 1.1, 1] : 1,
                color: state.isCardComplete ? '#9333ea' : undefined,
              }}
              exit={{ opacity: 0 }}
              className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}
            >
              {state.comboText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card canvas */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-2 min-h-0">
        {cardSize.width > 0 && (
          <BuildingCanvas
            shape={state.selectedShape}
            color={state.selectedColor}
            count={state.selectedCount}
            isCardComplete={state.isCardComplete}
            width={cardSize.width}
            height={cardSize.height}
            canvasRef={canvasRef}
          />
        )}
      </div>

      {/* Palettes */}
      <PaletteGroup paletteCount={paletteCount} onItemSize={setItemSize}>
        <ComponentPalette
          type="color"
          disabled={state.selectedColor !== null || state.isCardComplete}
          itemSize={itemSize}
          onDrop={handleColorDrop}
        />
        <ComponentPalette
          type="shape"
          disabled={state.selectedShape !== null || state.isCardComplete}
          itemSize={itemSize}
          onDrop={handleShapeDrop}
        />
        {paletteCount === 3 && (
          <ComponentPalette
            type="count"
            disabled={state.selectedCount !== null || state.isCardComplete}
            itemSize={itemSize}
            onDrop={handleCountDrop}
          />
        )}
      </PaletteGroup>

      {/* Celebration overlay */}
      <Celebration
        isActive={showCelebration}
        onComplete={handleCelebrationComplete}
      />
    </div>
  );
}

function buildCombo(
  shape: ShapeType,
  color: ColorType,
  count: CountType | null,
  paletteCount: 2 | 3,
): Combo | null {
  if (paletteCount === 2) {
    return { type: 'two-word', color, shape } as TwoWordCombo;
  }
  if (count !== null) {
    return { type: 'three-word', count, color, shape } as ThreeWordCombo;
  }
  return null;
}
