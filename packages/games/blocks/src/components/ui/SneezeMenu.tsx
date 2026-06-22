import { motion } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';
import { type Position, type NumberBlock, getBlockDimensions } from '../../types';

// Sneeze types
export type SneezeType = 'sneeze1' | 'sneeze2';

interface SneezeMenuProps {
  /** Current blocks on the canvas (for collision detection) */
  blocks: NumberBlock[];
  /** Called when a sneeze is dropped on a block */
  onSneeze: (blockId: string, sneezeType: SneezeType) => void;
  className?: string;
}

interface DraggableSneezeProps {
  type: SneezeType;
  label: string;
  blocks: NumberBlock[];
  onSneeze: (blockId: string) => void;
}

// Check if a point is inside a block's bounding box
function isPointInBlock(point: Position, block: NumberBlock): boolean {
  const dims = getBlockDimensions(block.value);
  return (
    point.x >= block.position.x &&
    point.x <= block.position.x + dims.width &&
    point.y >= block.position.y &&
    point.y <= block.position.y + dims.height
  );
}

// Find block at a given point
function findBlockAtPoint(point: Position, blocks: NumberBlock[]): NumberBlock | null {
  // Check in reverse order (top-most block first, assuming later = on top)
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (isPointInBlock(point, blocks[i])) {
      return blocks[i];
    }
  }
  return null;
}

// Cloud-like sneeze shape with number inside (uses vh-based sizing via CSS)
function SneezeCloud({ number, isDragging }: { number: 1 | 2; isDragging: boolean }) {
  return (
    <div className="sneeze-cloud">
      {/* Cloud/gust shape */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Cloud body - light fluffy shape */}
        <ellipse
          cx="24"
          cy="26"
          rx="18"
          ry="14"
          fill={isDragging ? 'rgba(200, 230, 255, 0.95)' : 'rgba(230, 245, 255, 0.9)'}
          stroke="rgba(150, 200, 255, 0.6)"
          strokeWidth="2"
        />
        {/* Cloud puffs */}
        <circle
          cx="12"
          cy="24"
          r="8"
          fill={isDragging ? 'rgba(200, 230, 255, 0.95)' : 'rgba(230, 245, 255, 0.9)'}
        />
        <circle
          cx="36"
          cy="24"
          r="8"
          fill={isDragging ? 'rgba(200, 230, 255, 0.95)' : 'rgba(230, 245, 255, 0.9)'}
        />
        <circle
          cx="20"
          cy="18"
          r="7"
          fill={isDragging ? 'rgba(200, 230, 255, 0.95)' : 'rgba(230, 245, 255, 0.9)'}
        />
        <circle
          cx="30"
          cy="18"
          r="6"
          fill={isDragging ? 'rgba(200, 230, 255, 0.95)' : 'rgba(230, 245, 255, 0.9)'}
        />
        {/* Wind lines for sneeze effect */}
        <path
          d="M42 22 Q46 22, 48 20"
          stroke="rgba(150, 200, 255, 0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M42 28 Q46 28, 48 30"
          stroke="rgba(150, 200, 255, 0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {/* Number inside the cloud */}
      <div className="sneeze-cloud-number">
        <span className="sneeze-cloud-digit">
          {number}
        </span>
      </div>
    </div>
  );
}

// Draggable sneeze component with respawn capability
function DraggableSneeze({ type, blocks, onSneeze }: Omit<DraggableSneezeProps, 'label'>) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUsedUp, setIsUsedUp] = useState(false); // Sneeze was used (hit or miss)
  const [isExploding, setIsExploding] = useState(false); // Hit a block - explode animation
  // Key to force remount after use (respawns a fresh sneeze)
  const [respawnKey, setRespawnKey] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: { point: { x: number; y: number } }
    ) => {
      setIsDragging(false);

      // Check if dropped on a block
      const targetBlock = findBlockAtPoint(info.point, blocks);

      if (targetBlock && targetBlock.value >= 1) {
        // Sneeze hit a block - trigger explosion animation
        setIsExploding(true);
        setIsUsedUp(true);
        onSneeze(targetBlock.id);

        // After explosion animation, respawn a fresh sneeze
        setTimeout(() => {
          setIsExploding(false);
          setIsUsedUp(false);
          setRespawnKey(prev => prev + 1);
        }, 500);
      } else {
        // Missed - sneeze dissipates where it landed
        setIsUsedUp(true);

        // After fade out, respawn a fresh sneeze
        setTimeout(() => {
          setIsUsedUp(false);
          setRespawnKey(prev => prev + 1);
        }, 300);
      }
    },
    [blocks, onSneeze]
  );

  const sneezeNumber = type === 'sneeze1' ? 1 : 2;

  // Determine animation state
  const getAnimateProps = () => {
    if (isExploding) {
      // Explode on block
      return {
        scale: [1.3, 1.8, 0],
        opacity: [1, 0.8, 0],
      };
    }
    if (isUsedUp) {
      // Missed - fade out where it is
      return {
        scale: 0.5,
        opacity: 0,
      };
    }
    // Normal state
    return {
      scale: 1,
      opacity: 1,
    };
  };

  return (
    <motion.div
      key={respawnKey} // Force remount when respawnKey changes
      ref={elementRef}
      className="sneeze-draggable cursor-grab active:cursor-grabbing"
      drag={!isUsedUp}
      dragMomentum={false}
      dragElastic={0.5}
      dragSnapToOrigin={false} // Never snap back - sneeze is used up
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileHover={!isUsedUp ? { scale: 1.1 } : undefined}
      whileTap={!isUsedUp ? { scale: 0.95 } : undefined}
      whileDrag={{ scale: 1.3, zIndex: 100 }}
      initial={{ scale: 1, opacity: 1 }}
      animate={getAnimateProps()}
      transition={isExploding ? {
        duration: 0.5,
        ease: 'easeOut',
      } : {
        duration: 0.3,
        ease: 'easeOut',
      }}
    >
      <SneezeCloud number={sneezeNumber} isDragging={isDragging} />

      {/* Ghost in original position when dragging - shows new sneeze ready */}
      {isDragging && !isUsedUp && (
        <div className="absolute inset-0 opacity-40">
          <SneezeCloud number={sneezeNumber} isDragging={false} />
        </div>
      )}
    </motion.div>
  );
}

export function SneezeMenu({ blocks, onSneeze, className = '' }: SneezeMenuProps) {
  const handleSneeze1 = useCallback(
    (blockId: string) => {
      onSneeze(blockId, 'sneeze1');
    },
    [onSneeze]
  );

  const handleSneeze2 = useCallback(
    (blockId: string) => {
      onSneeze(blockId, 'sneeze2');
    },
    [onSneeze]
  );

  return (
    <motion.div
      className={`sneeze-container relative pointer-events-auto ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Menu label */}
      <div className="sneeze-title">
        Sneeze
      </div>

      {/* Draggable sneezes in row */}
      <div className="sneeze-row">
        <DraggableSneeze
          type="sneeze1"
          blocks={blocks}
          onSneeze={handleSneeze1}
        />
        <DraggableSneeze
          type="sneeze2"
          blocks={blocks}
          onSneeze={handleSneeze2}
        />
      </div>
    </motion.div>
  );
}

// Split logic utilities
export function calculateSneeze1Split(value: number): [number, number] {
  // Sneeze 1: split to nearest 10
  // Special case: 1 → duplicate (1 + 1)
  // 2-10: (n-1) + 1
  // 11-20: 10 + (n-10)
  // 21-30: 20 + (n-20)
  // etc.

  if (value === 1) {
    return [1, 1]; // Duplicate the 1
  }

  if (value <= 10) {
    return [value - 1, 1];
  }

  const tens = Math.floor((value - 1) / 10) * 10;
  return [tens, value - tens];
}

export function calculateSneeze2Split(value: number): [number, number] {
  // Sneeze 2: split in half
  // Special case: 1 → 0 + 1 (0 is just a number, not a block)
  // Even: n/2 + n/2
  // Odd: floor(n/2) + ceil(n/2)

  if (value === 1) {
    return [0, 1]; // Zero (display only) + 1
  }

  const half = Math.floor(value / 2);
  return [half, value - half];
}

export default SneezeMenu;
