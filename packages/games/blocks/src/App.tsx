import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NumberBlock } from './components/blocks';
import { Mirror, VoiceButton, TranscriptDisplay, SubtractMenu, SneezeMenu, TrashCan, calculateSneeze1Split, calculateSneeze2Split, type SneezeType } from './components/ui';
import { AppShell } from './components/layout';
import { useNumberBlocks, useVoiceInput, useDarkMode } from './hooks';
import { getBlockDimensions, type Position, type NumberBlock as NumberBlockType } from './types';
import { throttle, playSneezeSound, playAdditionSound, playGulpSound } from './utils';


// State for the subtract menu
interface SubtractMenuState {
  blockId: string;
  blockValue: number;
  position: { x: number; y: number };
}

// Zero block (just a "0" number, no visual block)
interface ZeroBlock {
  id: string;
  position: { x: number; y: number };
}

// Check if a point is inside a block's bounding box
function isPointInBlock(point: Position, block: NumberBlockType): boolean {
  const dims = getBlockDimensions(block.value);
  return (
    point.x >= block.position.x &&
    point.x <= block.position.x + dims.width &&
    point.y >= block.position.y &&
    point.y <= block.position.y + dims.height
  );
}

// Find block at a given point
function findBlockAtPoint(point: Position, blocks: NumberBlockType[]): NumberBlockType | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (isPointInBlock(point, blocks[i])) {
      return blocks[i];
    }
  }
  return null;
}

// Addition sign component that appears when blocks overlap
function AdditionSign({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={{ left: x, top: y }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-green-400">
          <span className="text-3xl font-bold text-green-500">+</span>
        </div>
      </div>
    </motion.div>
  );
}

function App() {

  const {
    blocks,
    pendingCombination,
    addBlock,
    removeBlock,
    updateBlockPosition,
    startDragging,
    stopDragging,
    checkOverlap,
    finalizeCombine,
    splitBlock,
  } = useNumberBlocks();

  const voice = useVoiceInput();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  // Subtract menu state
  const [subtractMenu, setSubtractMenu] = useState<SubtractMenuState | null>(null);

  // Ref for the playground area to constrain block dragging
  const playgroundRef = useRef<HTMLDivElement>(null);

  // Ref for trash can to detect drops
  const trashCanRef = useRef<HTMLDivElement>(null);

  // Track last pointer position for trash detection
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Window size for drag constraints
  const [windowSize, setWindowSize] = useState({ width: 1920, height: 1080 });

  // Key that increments on orientation change to force block remount (resets Framer Motion drag state)
  const [orientationKey, setOrientationKey] = useState(0);

  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const updateSize = () => {
      // Debounce resize events to prevent excessive re-renders
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      }, 100);
    };
    // For orientation changes, use a longer delay to ensure dimensions are updated
    const handleOrientationChange = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Update both together - remount happens, then reposition effect fixes positions
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        setOrientationKey(prev => prev + 1);
      }, 300);
    };
    // Set initial size immediately
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Keep a ref to blocks so reposition effect doesn't re-run on every block change
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  // Track previous window size to detect actual dimension changes
  const prevWindowSize = useRef({ width: windowSize.width, height: windowSize.height });

  // Helper function to reposition blocks within bounds
  const repositionBlocks = useCallback(() => {
    const margin = 10;
    const topMargin = 40;
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;

    blocksRef.current.forEach((block) => {
      const dims = getBlockDimensions(block.value);
      const maxX = Math.max(margin, currentWidth - dims.width - margin);
      const maxY = Math.max(topMargin, currentHeight - dims.height - margin);

      const clampedX = Math.max(margin, Math.min(block.position.x, maxX));
      const clampedY = Math.max(topMargin, Math.min(block.position.y, maxY));

      if (clampedX !== block.position.x || clampedY !== block.position.y) {
        updateBlockPosition(block.id, { x: clampedX, y: clampedY });
      }
    });
  }, [updateBlockPosition]);

  // Reposition blocks when viewport dimensions actually change
  useEffect(() => {
    // Only run if dimensions actually changed
    if (
      prevWindowSize.current.width === windowSize.width &&
      prevWindowSize.current.height === windowSize.height
    ) {
      return;
    }
    prevWindowSize.current = { width: windowSize.width, height: windowSize.height };
    repositionBlocks();
  }, [windowSize.width, windowSize.height, repositionBlocks]);

  // Re-run reposition AFTER orientation key change causes blocks to remount
  // This is the main mechanism for bringing off-screen blocks back
  useEffect(() => {
    if (orientationKey === 0) return; // Skip initial mount

    // Delay to ensure blocks have fully remounted and rendered with fresh Framer Motion state
    const timer = setTimeout(repositionBlocks, 50);
    return () => clearTimeout(timer);
  }, [orientationKey, repositionBlocks]);

  // Calculate drag constraints for a specific block value
  // All edges constrained so no part of the block can leave the screen
  const getDragConstraints = useCallback((blockValue: number) => {
    const dims = getBlockDimensions(blockValue);
    // Ensure constraints are never negative (block larger than screen)
    const right = Math.max(0, windowSize.width - dims.width);
    const bottom = Math.max(0, windowSize.height - dims.height);
    // Top constraint accounts for the number label above the block (-top-10 = 40px)
    const top = 40;
    return {
      left: 0,
      top,
      right,
      bottom,
    };
  }, [windowSize]);


  // Track pointer position for trash can detection
  useEffect(() => {
    const trackPointer = (e: PointerEvent) => {
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('pointermove', trackPointer);
    return () => document.removeEventListener('pointermove', trackPointer);
  }, []);

  // Prevent all unwanted touch gestures (pinch zoom, screen drag)
  useEffect(() => {
    const preventGestures = (e: TouchEvent) => {
      // Allow single touch (for block dragging), block multi-touch
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventGestureEvent = (e: Event) => {
      e.preventDefault();
    };

    // Prevent pinch zoom and multi-touch gestures
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


  // Handle spawning from mirror - check for immediate combine
  const handleSpawn = useCallback(
    (value: number, position: Position) => {
      const spawnDims = getBlockDimensions(value);
      const spawnBox = {
        x: position.x,
        y: position.y,
        width: spawnDims.width,
        height: spawnDims.height,
      };

      // Check if spawn position overlaps with any existing block
      for (const block of blocks) {
        const blockDims = getBlockDimensions(block.value);
        const blockBox = {
          x: block.position.x,
          y: block.position.y,
          width: blockDims.width,
          height: blockDims.height,
        };

        const overlaps =
          spawnBox.x < blockBox.x + blockBox.width &&
          spawnBox.x + spawnBox.width > blockBox.x &&
          spawnBox.y < blockBox.y + blockBox.height &&
          spawnBox.y + spawnBox.height > blockBox.y;

        if (overlaps) {
          // Combine: remove old block, add combined block
          const newValue = value + block.value;
          const newDims = getBlockDimensions(newValue);

          // Center between the two
          const centerX = (spawnBox.x + spawnBox.width / 2 + blockBox.x + blockBox.width / 2) / 2;
          const centerY = (spawnBox.y + spawnBox.height / 2 + blockBox.y + blockBox.height / 2) / 2;

          const margin = 10;
          const topMargin = 40; // Account for number label above block
          const maxX = window.innerWidth - newDims.width - margin;
          const maxY = window.innerHeight - newDims.height - margin;

          const newX = Math.max(margin, Math.min(centerX - newDims.width / 2, maxX));
          const newY = Math.max(topMargin, Math.min(centerY - newDims.height / 2, maxY));

          removeBlock(block.id);
          addBlock(newValue, { x: newX, y: newY });
          playAdditionSound();
          return;
        }
      }

      // No overlap - just spawn normally
      addBlock(value, position);
    },
    [addBlock, removeBlock, blocks]
  );

  // Handle block drag events
  const handleDragStart = useCallback(
    (id: string) => {
      startDragging(id);
    },
    [startDragging]
  );

  // Throttle overlap checks to 50ms to prevent re-render storms on rapid drags
  const throttledCheckOverlap = useMemo(
    () => throttle((id: string, position: Position) => checkOverlap(id, position), 50),
    [checkOverlap]
  );

  const handleDrag = useCallback(
    (id: string, position: Position) => {
      // Don't update position state during drag - Framer Motion handles the visual
      // Only check for overlaps (for showing + sign)
      throttledCheckOverlap(id, position);
    },
    [throttledCheckOverlap]
  );

  const handleDragEnd = useCallback(
    (id: string, position: Position) => {
      // Check if dropped on trash can
      if (trashCanRef.current) {
        const rect = trashCanRef.current.getBoundingClientRect();
        const pos = lastPointerPos.current;
        const isOverTrash =
          pos.x >= rect.left &&
          pos.x <= rect.right &&
          pos.y >= rect.top &&
          pos.y <= rect.bottom;

        if (isOverTrash) {
          playGulpSound();
          removeBlock(id);
          return;
        }
      }

      updateBlockPosition(id, position);
      finalizeCombine(id, position); // Try to combine if overlapping
      stopDragging(id);
    },
    [updateBlockPosition, finalizeCombine, stopDragging, removeBlock]
  );

  // Handle right-click to show subtract menu
  const handleRightClick = useCallback(
    (id: string, value: number, position: { x: number; y: number }) => {
      setSubtractMenu({ blockId: id, blockValue: value, position });
    },
    []
  );

  // Handle subtract selection
  const handleSubtract = useCallback(
    (subtractValue: number) => {
      if (subtractMenu) {
        splitBlock(subtractMenu.blockId, subtractValue);
        setSubtractMenu(null);
      }
    },
    [subtractMenu, splitBlock]
  );

  // Close subtract menu
  const handleCloseSubtractMenu = useCallback(() => {
    setSubtractMenu(null);
  }, []);

  // Zero blocks state (for sneeze 2 on 1) - persistent zeros that don't fade
  const [zeroBlocks, setZeroBlocks] = useState<ZeroBlock[]>([]);

  // Handle sneeze (drag wind gust onto block)
  const handleSneeze = useCallback(
    (blockId: string, sneezeType: SneezeType) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block || block.value < 1) return;

      let first: number;
      let second: number;

      if (sneezeType === 'sneeze1') {
        [first, second] = calculateSneeze1Split(block.value);
      } else {
        [first, second] = calculateSneeze2Split(block.value);
      }

      // Sneeze sound delay - split happens in middle of sound effect (~500ms)
      const SNEEZE_SPLIT_DELAY = 500;

      // Special case: sneeze 1 on 1 → duplicate
      if (block.value === 1 && sneezeType === 'sneeze1') {
        playSneezeSound();
        // Delay the duplicate to sync with sound
        setTimeout(() => {
          const dims = getBlockDimensions(1);
          addBlock(1, {
            x: Math.min(block.position.x + dims.width + 20, window.innerWidth - dims.width - 10),
            y: block.position.y,
          });
        }, SNEEZE_SPLIT_DELAY);
        return;
      }

      // Special case: sneeze 2 on 1 → remove the 1 block and show persistent zero
      if (block.value === 1 && sneezeType === 'sneeze2') {
        playSneezeSound();
        // Delay to sync with sound, then remove block and add zero
        setTimeout(() => {
          const dims = getBlockDimensions(1);
          // Remove the 1 block
          removeBlock(blockId);
          // Add a persistent zero at its position
          setZeroBlocks(prev => [...prev, {
            id: crypto.randomUUID(),
            position: {
              x: block.position.x + dims.width / 2 - 20, // Center the 0 roughly
              y: block.position.y + dims.height / 2 - 30,
            },
          }]);
        }, SNEEZE_SPLIT_DELAY);
        return;
      }

      // Normal split: both values must be positive
      if (first > 0 && second > 0 && first + second === block.value) {
        playSneezeSound();
        // Delay split to sync with sound, skip normal split sound
        setTimeout(() => {
          splitBlock(blockId, second, true);
        }, SNEEZE_SPLIT_DELAY);
      }
    },
    [blocks, splitBlock, addBlock, removeBlock]
  );

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between pointer-events-none">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-full overflow-hidden bg-gray-400"
              animate={{ rotate: [0, 2, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <img src="/logo.png" alt="RenderBlocks" className="w-full h-full object-cover" />
            </motion.div>
            <span className={`text-xl font-bold hidden sm:inline ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              RenderBlocks
            </span>
          </div>

          {/* Block count and dark mode toggle */}
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </div>
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
        <div className="flex items-center justify-between gap-4 pointer-events-none">
          {/* Mirror for spawning blocks 1-10 (left side) */}
          <Mirror onSpawn={handleSpawn} />

          {/* Voice button (center) */}
          <div className="flex flex-col items-center gap-2 pointer-events-auto">
            <VoiceButton
              isListening={voice.isListening}
              isSupported={voice.isSupported}
              onPress={voice.startListening}
              onRelease={voice.stopListening}
            />
          </div>

          {/* Trash can and Sneeze menu (right side) */}
          <div className="flex items-end gap-2">
            <TrashCan ref={trashCanRef} />
            <SneezeMenu blocks={blocks} onSneeze={handleSneeze} />
          </div>
        </div>
      }
    >
      {/* Main playground area */}
      <div
        ref={playgroundRef}
        className="relative w-full h-full overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        {/* Blocks */}
        <AnimatePresence>
          {blocks.map((block) => (
            <NumberBlock
              key={`${block.id}-${orientationKey}`}
              id={block.id}
              value={block.value}
              position={block.position}
              createdAt={block.createdAt}
              isDragging={block.isDragging}
              dragConstraints={getDragConstraints(block.value)}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onRightClick={handleRightClick}
            />
          ))}
        </AnimatePresence>

        {/* Addition sign when blocks overlap */}
        <AnimatePresence>
          {pendingCombination && (
            <AdditionSign
              x={pendingCombination.position.x}
              y={pendingCombination.position.y}
            />
          )}
        </AnimatePresence>

        {/* Subtract menu (right-click) */}
        <AnimatePresence>
          {subtractMenu && (
            <SubtractMenu
              blockValue={subtractMenu.blockValue}
              position={subtractMenu.position}
              onSelect={handleSubtract}
              onClose={handleCloseSubtractMenu}
            />
          )}
        </AnimatePresence>

        {/* Zero blocks (sneeze 2 on 1) - persistent, no fading, same size as block numberlings */}
        <AnimatePresence>
          {zeroBlocks.map((zero) => (
            <motion.div
              key={zero.id}
              className="absolute pointer-events-auto z-40 text-4xl font-bold text-black cursor-grab active:cursor-grabbing"
              style={{
                left: zero.position.x,
                top: zero.position.y,
                textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7), 0 0 24px rgba(255,255,255,0.5)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              drag
              dragMomentum={false}
              dragElastic={0}
              onDragEnd={(_e, info) => {
                // Check if dropped on a block
                const targetBlock = findBlockAtPoint(info.point, blocks);

                if (targetBlock) {
                  // Zero combines with block (0 + n = n) - zero vanishes
                  setZeroBlocks(prev => prev.filter(z => z.id !== zero.id));
                  playAdditionSound(); // Feedback that something happened
                } else {
                  // Update zero position after drag
                  setZeroBlocks(prev => prev.map(z =>
                    z.id === zero.id
                      ? { ...z, position: { x: info.point.x - 20, y: info.point.y - 30 } }
                      : z
                  ));
                }
              }}
            >
              0
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Voice transcript */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <TranscriptDisplay
            transcript={voice.transcript}
            isListening={voice.isListening}
          />
        </div>

        {/* Empty state */}
        {blocks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="flex justify-center gap-2 mb-4"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor:
                        n === 1 ? '#FF0000' : n === 2 ? '#FF8C00' : '#FFD700',
                      boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.2)',
                    }}
                  >
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>
                ))}
              </motion.div>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Drag blocks from the mirror to start!
              </p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Drag blocks together to combine them
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default App;
