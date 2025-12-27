import { motion, type PanInfo } from 'framer-motion';
import { useMemo, useRef } from 'react';
import {
  CUBE_SIZE,
  CUBE_GAP,
  getNumberBlockColor,
  getBlockDimensions,
  type Position,
} from '../../types';

interface NumberBlockProps {
  id: string;
  value: number;
  position: Position;
  isDragging?: boolean;
  onDragStart?: (id: string) => void;
  onDrag?: (id: string, position: Position) => void;
  onDragEnd?: (id: string, position: Position) => void;
  onRightClick?: (id: string, value: number, position: { x: number; y: number }) => void;
}

// Generate cube positions for a given value
function getCubePositions(value: number): Position[] {
  const positions: Position[] = [];

  // 4 is a 2x2 square
  if (value === 4) {
    for (let i = 0; i < 4; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      positions.push({
        x: col * (CUBE_SIZE + CUBE_GAP),
        y: (1 - row) * (CUBE_SIZE + CUBE_GAP), // bottom to top
      });
    }
  } else if (value === 7) {
    // 7 is special - always vertical (rainbow tower)
    for (let i = 0; i < value; i++) {
      positions.push({
        x: 0,
        y: (value - 1 - i) * (CUBE_SIZE + CUBE_GAP),
      });
    }
  } else if (value === 9) {
    // 9 is a 3x3 square
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      positions.push({
        x: col * (CUBE_SIZE + CUBE_GAP),
        y: (2 - row) * (CUBE_SIZE + CUBE_GAP), // bottom to top
      });
    }
  } else if (value <= 5) {
    // Stack vertically (bottom to top)
    for (let i = 0; i < value; i++) {
      positions.push({
        x: 0,
        y: (value - 1 - i) * (CUBE_SIZE + CUBE_GAP),
      });
    }
  } else {
    // 6-29: 2 columns wide
    // 30-39: 3 columns, 40-49: 4 columns, etc.
    // Fill left-to-right, bottom-to-top (remainder at top, odd cubes on left)
    let cols = 2;
    if (value >= 30) {
      cols = Math.floor(value / 10);
    }
    const rows = Math.ceil(value / cols);
    for (let i = 0; i < value; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions.push({
        x: col * (CUBE_SIZE + CUBE_GAP),
        y: (rows - 1 - row) * (CUBE_SIZE + CUBE_GAP), // bottom to top
      });
    }
  }

  return positions;
}

// Single cube component
function Cube({
  color,
  hasRedOutline,
  hasFace,
  eyeCount = 2,
  starEyes,
  style,
}: {
  color: string;
  hasRedOutline?: boolean;
  hasFace?: boolean;
  eyeCount?: number;
  starEyes?: 'red' | 'blue' | false;
  style?: React.CSSProperties;
}) {
  const renderStarEye = (color: 'red' | 'blue') => (
    <div className={`cube-eye-star star-${color}`}>
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
        border: hasRedOutline ? '3px solid #FF0000' : undefined,
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

// Gray gradient colors for 9 (lightest at bottom, darkest at top)
const NINE_GRAY_COLORS = [
  '#D0D0D0', // bottom row - lightest
  '#D0D0D0',
  '#D0D0D0',
  '#A0A0A0', // middle row
  '#A0A0A0',
  '#A0A0A0',
  '#606060', // top row - darkest
  '#606060',
  '#606060',
];

// Get the color for a specific cube within a block
function getCubeColor(blockValue: number, cubeIndex: number, totalCubes: number): string {
  // Special case: 7 is a rainbow (each cube is a different color)
  if (blockValue === 7) {
    // cubeIndex 0 is bottom, so we need to map to 1-7 from bottom to top
    // In getCubePositions, index 0 has highest y (bottom), last index has lowest y (top)
    // So cubeIndex 0 = bottom = color 1, cubeIndex 6 = top = color 7
    return getNumberBlockColor(cubeIndex + 1);
  }

  // Special case: 9 is a gray gradient (light at bottom, dark at top)
  if (blockValue === 9) {
    return NINE_GRAY_COLORS[cubeIndex] || '#808080';
  }

  if (blockValue <= 10) {
    // Simple case: all cubes same color
    return getNumberBlockColor(blockValue);
  }

  // For values > 10: first N*10 cubes are white (the "tens"), rest are remainder color
  const tensCount = Math.floor(blockValue / 10) * 10;
  const remainder = blockValue % 10;

  if (cubeIndex < tensCount) {
    return '#FFFFFF'; // White for the tens portion
  } else {
    const remainderIndex = cubeIndex - tensCount;
    // If remainder is 7, the extra cubes should be rainbow
    if (remainder === 7) {
      return getNumberBlockColor(remainderIndex + 1);
    }
    // If remainder is 9, use gray gradient for the extra cubes
    if (remainder === 9) {
      return NINE_GRAY_COLORS[remainderIndex] || '#808080';
    }
    // If remainder is 0, it's a multiple of 10 - all white (handled above)
    return remainder === 0 ? '#FFFFFF' : getNumberBlockColor(remainder);
  }
}

export function NumberBlock({
  id,
  value,
  position,
  onDragStart,
  onDrag,
  onDragEnd,
  onRightClick,
}: NumberBlockProps) {
  const dimensions = getBlockDimensions(value);
  const cubePositions = useMemo(() => getCubePositions(value), [value]);

  // Track the position at drag start
  const dragStartPos = useRef<Position>(position);

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

  // Star eyes for 5 (blue) and 10 (red)
  const starEyes = value === 5 ? 'blue' : value === 10 ? 'red' : false;

  const handleDragStart = () => {
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
      className="absolute touch-target no-select drag-none cursor-grab active:cursor-grabbing"
      onContextMenu={handleContextMenu}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        x: position.x,
        y: position.y,
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
      }}
      drag
      dragMomentum={false}
      dragElastic={0}
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
        filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      {cubePositions.map((pos, index) => {
        // Red outline for: 10, multiples of 10, or the tens portion of larger numbers
        const tensCount = value >= 10 ? Math.floor(value / 10) * 10 : 0;
        const hasRedOutline = value >= 10 && (value % 10 === 0 || index < tensCount);
        return (
          <Cube
            key={index}
            color={getCubeColor(value, index, cubePositions.length)}
            hasRedOutline={hasRedOutline}
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
        className="block-label absolute -top-7 left-1/2 -translate-x-1/2 text-lg font-bold text-gray-700 pointer-events-none"
        style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
      >
        {value}
      </div>
    </motion.div>
  );
}

export default NumberBlock;
