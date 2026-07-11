import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScreenDefinition, ShapeType, ColorType, CountType } from '../../../types';
import { getComboLabel, COLOR_HEX } from '../../../types';
import { ShapeRenderer } from '../../shapes';
import { useComponentMatchingState } from '../../../hooks/useComponentMatchingState';
import type { MatchingCard } from '../../../hooks/useComponentMatchingState';
import { useTimer } from '../../../hooks/useTimer';
import { calculateGridDimensions } from '../../../utils/layout';
import { ComponentPalette } from '../shared/ComponentPalette';
import { PaletteGroup } from '../shared/PaletteGroup';
import { Card } from '../../cards';
import { Timer, Celebration } from '../../ui';
import {
  playShapeSound,
  playColorSound,
  playCountSound,
  playHooraySound,
  playWrongSound,
  playSnapSound,
  resumeAudioContext,
} from '../../../utils/sounds';

interface ComponentMatchingGameProps {
  screen: ScreenDefinition;
  failCount: number;
  onComplete: () => void;
  onTimeout: () => void;
  onBack: () => void;
  isDark: boolean;
}

export function ComponentMatchingGame({
  screen,
  failCount,
  onComplete,
  onTimeout,
  onBack,
  isDark,
}: ComponentMatchingGameProps) {
  const { state, actions } = useComponentMatchingState();
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showCelebration, setShowCelebration] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [itemSize, setItemSize] = useState(32);
  // Track cards that just completed for delayed removal
  const pendingCompletions = useRef<Set<string>>(new Set());

  const timeBonus = failCount * 15;
  const paletteCount = (screen.paletteCount ?? 2) as 2 | 3;
  const targetCount = screen.targetCount ?? 20;

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
    actions.initCards(screen.comboType, targetCount);
    setInitialized(true);
  }, [screen.id]);

  // Start timer once initialized
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

  // Handle fully matched cards — animate out after brief delay
  useEffect(() => {
    const newlyComplete = state.cards.filter(
      mc => mc.isFullyMatched && mc.card.state === 'face-up' && !pendingCompletions.current.has(mc.card.id)
    );
    newlyComplete.forEach(mc => {
      pendingCompletions.current.add(mc.card.id);
      playHooraySound();
      setTimeout(() => {
        actions.completeCard(mc.card.id);
        pendingCompletions.current.delete(mc.card.id);
      }, 800);
    });
  }, [state.cards]);

  // Handle game completion
  useEffect(() => {
    if (state.isComplete) {
      timer.pause();
      setShowCelebration(true);
    }
  }, [state.isComplete]);

  // Grid dimensions
  const grid = useMemo(
    () => containerSize.width > 0
      ? calculateGridDimensions(containerSize.width, containerSize.height, state.cards.length || 20)
      : null,
    [containerSize.width, containerSize.height, state.cards.length],
  );

  // Find which card a drop point lands on
  const findCardAtPoint = useCallback((dropPoint: { x: number; y: number }): string | null => {
    if (!gridRef.current || !grid) return null;

    // Use elementsFromPoint to find the card element
    const elements = document.elementsFromPoint(dropPoint.x, dropPoint.y);
    for (const el of elements) {
      const cardId = (el as HTMLElement).dataset?.cardId;
      if (cardId) return cardId;
    }
    return null;
  }, [grid]);

  // Handle palette drops
  const handleDrop = useCallback((
    componentType: 'shape' | 'color' | 'count',
    value: ShapeType | ColorType | CountType,
    dropPoint: { x: number; y: number },
  ) => {
    if (state.isComplete) return;

    const cardId = findCardAtPoint(dropPoint);
    if (!cardId) return;

    const mc = state.cards.find(c => c.card.id === cardId);
    if (!mc) return;

    const isMatch = actions.attemptMatch(cardId, componentType, value);
    if (isMatch) {
      // Check if this match completes the card
      const willBeFullyMatched =
        (componentType === 'shape' || mc.matchedComponents.shape) &&
        (componentType === 'color' || mc.matchedComponents.color) &&
        (componentType === 'count' || mc.matchedComponents.count);

      if (willBeFullyMatched) {
        // "cheer" will play from the fully-matched effect
      } else {
        // Partial match — play "yes" confirmation
        playSnapSound();
      }

      // Play the component name audio
      if (componentType === 'shape') playShapeSound(value as ShapeType);
      else if (componentType === 'color') playColorSound(value as ColorType);
      else if (componentType === 'count') playCountSound(value as CountType);

      actions.setComboText(getComboLabel(mc.card.combo));
    } else {
      playWrongSound();
    }
  }, [state.isComplete, state.cards, findCardAtPoint, actions]);

  const handleShapeDrop = useCallback((value: ShapeType | ColorType | CountType, dropPoint: { x: number; y: number }) => {
    handleDrop('shape', value, dropPoint);
  }, [handleDrop]);

  const handleColorDrop = useCallback((value: ShapeType | ColorType | CountType, dropPoint: { x: number; y: number }) => {
    handleDrop('color', value, dropPoint);
  }, [handleDrop]);

  const handleCountDrop = useCallback((value: ShapeType | ColorType | CountType, dropPoint: { x: number; y: number }) => {
    handleDrop('count', value, dropPoint);
  }, [handleDrop]);

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
          {state.matchedCardCount} / {state.totalCards}
        </div>
      </div>

      {/* Combo text display */}
      <div className="h-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {state.comboText && (
            <motion.div
              key={state.comboText}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}
            >
              {state.comboText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card grid with progress dots */}
      <div ref={containerRef} className="flex-1 p-1 min-h-0">
        {grid && state.cards.length > 0 && (
          <div
            ref={gridRef}
            className="grid place-items-center"
            style={{
              gridTemplateColumns: `repeat(${grid.cols}, ${grid.cardWidth}px)`,
              gap: grid.gap,
              justifyContent: 'center',
              alignContent: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            {state.cards.map((mc: MatchingCard) => {
              const isMatched = mc.card.state === 'matched';
              const combo = mc.card.combo;
              const hasAnyMatch = mc.matchedComponents.shape || mc.matchedComponents.color ||
                (combo.type === 'three-word' && mc.matchedComponents.count);

              return (
                <div
                  key={mc.card.id}
                  data-card-id={mc.card.id}
                  className="flex flex-col items-center"
                >
                  {isMatched ? (
                    <div style={{ width: grid.cardWidth, height: grid.cardHeight }} />
                  ) : (
                    <div data-card-id={mc.card.id} className="relative">
                      <Card
                        combo={combo}
                        isFaceUp={true}
                        width={grid.cardWidth}
                        height={grid.cardHeight}
                        isMatched={mc.isFullyMatched}
                      />
                      {/* Match indicator overlays */}
                      {hasAnyMatch && !mc.isFullyMatched && (
                        <div
                          className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
                          data-card-id={mc.card.id}
                        >
                          {/* Color matched: color wash */}
                          {mc.matchedComponents.color && (
                            <div
                              className="absolute inset-0 rounded-xl"
                              style={{ backgroundColor: COLOR_HEX[combo.color], opacity: 0.25 }}
                            />
                          )}
                          {/* Shape matched: shape badge top-right */}
                          {mc.matchedComponents.shape && (
                            <div className="absolute top-1 right-1 opacity-60">
                              <ShapeRenderer
                                shapeType={combo.shape}
                                size={grid.cardWidth * 0.3}
                                color={mc.matchedComponents.color ? COLOR_HEX[combo.color] : '#666666'}
                              />
                            </div>
                          )}
                          {/* Count matched: large number overlay */}
                          {combo.type === 'three-word' && mc.matchedComponents.count && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span
                                className="font-black opacity-25"
                                style={{
                                  fontSize: grid.cardHeight * 0.4,
                                  color: mc.matchedComponents.color ? COLOR_HEX[combo.color] : '#666666',
                                }}
                              >
                                {combo.count}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Palettes */}
      <PaletteGroup paletteCount={paletteCount} onItemSize={setItemSize}>
        <ComponentPalette type="color" itemSize={itemSize} onDrop={handleColorDrop} />
        <ComponentPalette type="shape" itemSize={itemSize} onDrop={handleShapeDrop} />
        {paletteCount === 3 && (
          <ComponentPalette type="count" itemSize={itemSize} onDrop={handleCountDrop} />
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
