import { motion, type PanInfo } from 'framer-motion';
import { useRef, useState, useEffect, type RefObject } from 'react';
import {
  getCubeSize,
  getCubeGap,
  getBlockDimensions,
  type Position,
} from '../../types';
import { getCubePositions, getCubeColor, getCubeOutlineColor } from '../../cubeLayout';

// Cooldown period for new blocks (ms)
const BLOCK_COOLDOWN_MS = 150;

interface NumberBlockProps {
  id: string;
  value: number;
  position: Position;
  createdAt: number;
  isDragging?: boolean;
  dragConstraints?: RefObject<HTMLElement | null> | { left: number; top: number; right: number; bottom: number };
  onDragStart?: (id: string) => void;
  onDrag?: (id: string, position: Position) => void;
  onDragEnd?: (id: string, position: Position) => void;
  onRightClick?: (id: string, value: number, position: { x: number; y: number }) => void;
}

// Single cube component
function Cube({
  color,
  outlineColor,
  hasFace,
  eyeCount = 2,
  starEyes,
  style,
}: {
  color: string;
  outlineColor?: string | null;
  hasFace?: boolean;
  eyeCount?: number;
  starEyes?: 'red' | 'blue' | false;
  style?: React.CSSProperties;
}) {
  const renderStarEye = (starColor: 'red' | 'blue') => (
    <div className={`cube-eye-star star-${starColor}`}>
      <div className="eye-inner" />
    </div>
  );

  const renderNormalEye = () => <div className="cube-eye" />;

  return (
    <div
      className="cube absolute"
      style={{
        ...style,
        backgroundColor: color,
        border: outlineColor ? `3px solid ${outlineColor}` : undefined,
        boxSizing: 'border-box',
      }}
    >
      {hasFace && (
        <div className="cube-face">
          <div className="cube-eyes">
            {/* Left eye */}
            {eyeCount >= 1 && (starEyes === 'blue' ? renderStarEye('blue') : starEyes === 'red' ? renderStarEye('red') : renderNormalEye())}
            {/* Right eye - normal for 5, star for 10, normal otherwise */}
            {eyeCount >= 2 && (starEyes === 'red' ? renderStarEye('red') : renderNormalEye())}
          </div>
          <div className="cube-mouth" />
        </div>
      )}
    </div>
  );
}

export function NumberBlock({
  id,
  value,
  position,
  createdAt,
  dragConstraints,
  onDragStart,
  onDrag,
  onDragEnd,
  onRightClick,
}: NumberBlockProps) {
  // Get dynamic cube dimensions based on viewport
  const cubeSize = getCubeSize();
  const cubeGap = getCubeGap();

  const dimensions = getBlockDimensions(value);
  // Recalculate positions each render (cube size is viewport-dependent)
  const cubePositions = getCubePositions(value, cubeSize, cubeGap);

  // Track the position at drag start
  const dragStartPos = useRef<Position>(position);

  // Track if we're currently dragging (to avoid syncing position during drag)
  const [localIsDragging, setLocalIsDragging] = useState(false);

  // Sync dragStartPos when position changes externally (NOT during drag)
  useEffect(() => {
    if (!localIsDragging) {
      dragStartPos.current = position;
    }
  }, [position.x, position.y, localIsDragging]);

  // Cooldown state - block ignores input briefly after creation
  const [isInCooldown, setIsInCooldown] = useState(() => Date.now() - createdAt < BLOCK_COOLDOWN_MS);

  useEffect(() => {
    if (!isInCooldown) return;
    const remaining = BLOCK_COOLDOWN_MS - (Date.now() - createdAt);
    if (remaining <= 0) {
      setIsInCooldown(false);
      return;
    }
    const timer = setTimeout(() => setIsInCooldown(false), remaining);
    return () => clearTimeout(timer);
  }, [createdAt, isInCooldown]);

  // Top-left cube gets the face (smallest y, then smallest x)
  // This ensures the face is on the top-left remainder cube for values > 10
  const topCubeIndex = cubePositions.reduce(
    (minIdx, pos, idx, arr) => {
      const minPos = arr[minIdx];
      // First compare y (smaller = higher on screen)
      if (pos.y < minPos.y) return idx;
      if (pos.y > minPos.y) return minIdx;
      // Same y: prefer leftmost (smaller x)
      if (pos.x < minPos.x) return idx;
      return minIdx;
    },
    0
  );

  // Number of eyes based on value (only 1 has 1 eye, others have 2)
  const eyeCount = value === 1 ? 1 : 2;

  // Star eyes for 5, 50 (blue) and 10, 100 (red)
  const starEyes = (value === 5 || value === 50) ? 'blue' : (value === 10 || value === 100) ? 'red' : false;

  const handleDragStart = () => {
    setLocalIsDragging(true);
    dragStartPos.current = position;
    onDragStart?.(id);
  };

  const handleDrag = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const currentPos = {
      x: dragStartPos.current.x + info.offset.x,
      y: dragStartPos.current.y + info.offset.y,
    };
    onDrag?.(id, currentPos);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    setLocalIsDragging(false);
    const finalPos = {
      x: dragStartPos.current.x + info.offset.x,
      y: dragStartPos.current.y + info.offset.y,
    };
    onDragEnd?.(id, finalPos);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Only show subtract menu for values > 1
    if (value > 1 && onRightClick) {
      onRightClick(id, value, { x: e.clientX, y: e.clientY });
    }
  };

  return (
    <motion.div
      className={`absolute touch-target no-select drag-none cursor-grab active:cursor-grabbing ${isInCooldown ? 'pointer-events-none' : 'pointer-events-auto'}`}
      onContextMenu={handleContextMenu}
      style={{
        x: position.x,
        y: position.y,
        width: dimensions.width,
        height: dimensions.height,
        // Using boxShadow instead of filter to avoid Framer Motion NaN animation bug
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      }}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={dragConstraints}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 10 }}
      whileHover={{ scale: 1.05 }}
      whileDrag={{
        scale: 1.1,
        zIndex: 1000,
        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      {cubePositions.map((pos, index) => {
        return (
          <Cube
            key={index}
            color={getCubeColor(value, index, cubePositions.length)}
            outlineColor={getCubeOutlineColor(value, index)}
            hasFace={index === topCubeIndex}
            eyeCount={eyeCount}
            starEyes={starEyes}
            style={{
              left: pos.x,
              top: pos.y,
            }}
          />
        );
      })}

      {/* Value label */}
      <div
        className="block-label absolute -top-10 left-1/2 -translate-x-1/2 text-4xl font-bold text-black pointer-events-none"
        style={{
          textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7), 0 0 24px rgba(255,255,255,0.5)',
        }}
      >
        {value}
      </div>
    </motion.div>
  );
}

export default NumberBlock;
