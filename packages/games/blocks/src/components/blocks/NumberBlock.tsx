import { motion, type PanInfo } from 'framer-motion';
import { useRef, useState, useEffect, type RefObject } from 'react';
import {
  getCubeSize,
  getCubeGap,
  getNumberBlockColor,
  getBlockDimensions,
  type Position,
} from '../../types';

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

// Helper: get positions for a sub-block (used for tens/units remainder)
function getSubBlockPositions(count: number, offsetX: number, offsetY: number, cubeSize: number, cubeGap: number): Position[] {
  const positions: Position[] = [];
  if (count === 0) return positions;

  // Special arrangements for certain numbers
  if (count === 4) {
    // 2x2 square
    for (let i = 0; i < 4; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      positions.push({
        x: offsetX + col * (cubeSize + cubeGap),
        y: offsetY + (1 - row) * (cubeSize + cubeGap),
      });
    }
  } else if (count === 7) {
    // Vertical rainbow tower
    for (let i = 0; i < count; i++) {
      positions.push({
        x: offsetX,
        y: offsetY + (count - 1 - i) * (cubeSize + cubeGap),
      });
    }
  } else if (count === 9) {
    // 3x3 square
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      positions.push({
        x: offsetX + col * (cubeSize + cubeGap),
        y: offsetY + (2 - row) * (cubeSize + cubeGap),
      });
    }
  } else if (count <= 5) {
    // Vertical stack
    for (let i = 0; i < count; i++) {
      positions.push({
        x: offsetX,
        y: offsetY + (count - 1 - i) * (cubeSize + cubeGap),
      });
    }
  } else {
    // 2 columns for 6+
    let cols = 2;
    if (count >= 30) cols = Math.floor(count / 10);
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions.push({
        x: offsetX + col * (cubeSize + cubeGap),
        y: offsetY + (rows - 1 - row) * (cubeSize + cubeGap),
      });
    }
  }
  return positions;
}

// Generate cube positions for a given value
function getCubePositions(value: number, cubeSize: number, cubeGap: number): Position[] {
  // For values < 100, use simple layouts
  if (value < 100) {
    return getSubBlockPositions(value, 0, 0, cubeSize, cubeGap);
  }

  // For values 100-999: arrange hundreds as 10×10 squares
  const positions: Position[] = [];
  const hundreds = Math.floor(value / 100);
  const tensAndUnits = value % 100;

  // Size of a 10×10 hundred-square (including internal gaps)
  const hundredSquareSize = 10 * cubeSize + 9 * cubeGap;
  const hundredSquareSpacing = hundredSquareSize + cubeGap * 2; // gap between squares

  // Arrange hundred-squares: stack vertically for 1-3, then use columns
  let hundredCols = 1;
  if (hundreds >= 4) hundredCols = 2;
  if (hundreds >= 7) hundredCols = 3;
  const hundredRows = Math.ceil(hundreds / hundredCols);

  // Generate positions for cubes in hundred-squares
  for (let i = 0; i < hundreds * 100; i++) {
    const whichHundred = Math.floor(i / 100);
    const posInHundred = i % 100;

    const hRow = Math.floor(whichHundred / hundredCols);
    const hCol = whichHundred % hundredCols;

    const cubeRow = Math.floor(posInHundred / 10);
    const cubeCol = posInHundred % 10;

    positions.push({
      x: hCol * hundredSquareSpacing + cubeCol * (cubeSize + cubeGap),
      y: (hundredRows - 1 - hRow) * hundredSquareSpacing + (9 - cubeRow) * (cubeSize + cubeGap),
    });
  }

  // Add remainder (tens + units) to the right of the hundreds
  if (tensAndUnits > 0) {
    const remainderOffsetX = hundredCols * hundredSquareSpacing + cubeGap * 2;
    // Align remainder to bottom of the hundreds area
    const remainderPositions = getSubBlockPositions(tensAndUnits, remainderOffsetX, 0, cubeSize, cubeGap);
    positions.push(...remainderPositions);
  }

  return positions;
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

// Pale versions of each Numberblock color (for tens portions)
const PALE_COLORS: Record<number, string> = {
  1: '#FFFFFF',  // White (special case for 10s)
  2: '#FFD4A8',  // Pale orange
  3: '#FFF4B8',  // Pale yellow
  4: '#B8F0B8',  // Pale green
  5: '#B8E8FF',  // Pale cyan
  6: '#C4A8D0',  // Pale indigo
  7: '#D8B8FF',  // Pale violet
  8: '#FFB8FF',  // Pale magenta
  9: '#C8C8C8',  // Pale gray
};

// Helper: get color for a digit, handling special cases (7=rainbow, 9=gray gradient)
function getDigitColor(digit: number, indexWithinDigit: number, isPale: boolean): string {
  if (digit === 7) {
    // Rainbow: each position gets a different color
    const color = indexWithinDigit + 1;
    return isPale ? (PALE_COLORS[color] || '#FFFFFF') : getNumberBlockColor(color);
  }
  if (digit === 9 && !isPale) {
    // Gray gradient only for primary (not pale)
    return NINE_GRAY_COLORS[indexWithinDigit] || '#808080';
  }
  return isPale ? (PALE_COLORS[digit] || '#FFFFFF') : getNumberBlockColor(digit);
}

// Get the color for a specific cube within a block
// Order of magnitude alternation: units=primary, tens=pale, hundreds=primary, thousands=pale, etc.
function getCubeColor(blockValue: number, cubeIndex: number, _totalCubes: number): string {
  // Base cases (1-10)
  if (blockValue <= 10) {
    if (blockValue === 7) {
      return getNumberBlockColor(cubeIndex + 1);
    }
    if (blockValue === 9) {
      return NINE_GRAY_COLORS[cubeIndex] || '#808080';
    }
    return getNumberBlockColor(blockValue);
  }

  // For values 11-99: tens=pale, units=primary
  if (blockValue < 100) {
    const tensDigit = Math.floor(blockValue / 10);
    const tensCount = tensDigit * 10;
    const units = blockValue % 10;

    if (cubeIndex < tensCount) {
      // TENS PORTION: pale
      if (tensDigit === 7) {
        const column = Math.floor(cubeIndex / 10);
        return PALE_COLORS[column + 1] || '#FFFFFF';
      }
      return PALE_COLORS[tensDigit] || '#FFFFFF';
    } else {
      // UNITS PORTION: primary
      const unitsIndex = cubeIndex - tensCount;
      return getDigitColor(units, unitsIndex, false);
    }
  }

  // For values 100-999: hundreds=primary, tens=pale, units=primary
  if (blockValue < 1000) {
    const hundredsDigit = Math.floor(blockValue / 100);
    const hundredsCount = hundredsDigit * 100;
    const tensDigit = Math.floor((blockValue % 100) / 10);
    const tensCount = tensDigit * 10;
    const units = blockValue % 10;

    if (cubeIndex < hundredsCount) {
      // HUNDREDS PORTION: primary
      if (hundredsDigit === 7) {
        // Rainbow hundreds: each column of 100 gets a different color
        const column = Math.floor(cubeIndex / 100);
        return getNumberBlockColor(column + 1);
      }
      return getNumberBlockColor(hundredsDigit);
    } else if (cubeIndex < hundredsCount + tensCount) {
      // TENS PORTION: pale
      const tensIndex = cubeIndex - hundredsCount;
      if (tensDigit === 7) {
        const column = Math.floor(tensIndex / 10);
        return PALE_COLORS[column + 1] || '#FFFFFF';
      }
      return PALE_COLORS[tensDigit] || '#FFFFFF';
    } else {
      // UNITS PORTION: primary
      const unitsIndex = cubeIndex - hundredsCount - tensCount;
      return getDigitColor(units, unitsIndex, false);
    }
  }

  // For values 1000+: thousands=pale, hundreds=primary, tens=pale, units=primary
  const thousandsDigit = Math.floor(blockValue / 1000);
  const thousandsCount = thousandsDigit * 1000;
  const hundredsDigit = Math.floor((blockValue % 1000) / 100);
  const hundredsCount = hundredsDigit * 100;
  const tensDigit = Math.floor((blockValue % 100) / 10);
  const tensCount = tensDigit * 10;
  const units = blockValue % 10;

  if (cubeIndex < thousandsCount) {
    // THOUSANDS PORTION: pale
    if (thousandsDigit === 7) {
      const column = Math.floor(cubeIndex / 1000);
      return PALE_COLORS[column + 1] || '#FFFFFF';
    }
    return PALE_COLORS[thousandsDigit] || '#FFFFFF';
  } else if (cubeIndex < thousandsCount + hundredsCount) {
    // HUNDREDS PORTION: primary
    if (hundredsDigit === 7) {
      const column = Math.floor((cubeIndex - thousandsCount) / 100);
      return getNumberBlockColor(column + 1);
    }
    return getNumberBlockColor(hundredsDigit);
  } else if (cubeIndex < thousandsCount + hundredsCount + tensCount) {
    // TENS PORTION: pale
    const tensIndex = cubeIndex - thousandsCount - hundredsCount;
    if (tensDigit === 7) {
      const column = Math.floor(tensIndex / 10);
      return PALE_COLORS[column + 1] || '#FFFFFF';
    }
    return PALE_COLORS[tensDigit] || '#FFFFFF';
  } else {
    // UNITS PORTION: primary
    const unitsIndex = cubeIndex - thousandsCount - hundredsCount - tensCount;
    return getDigitColor(units, unitsIndex, false);
  }
}

// Get the outline color for a specific cube (null = no outline)
// Outlines match the digit color (primary version) for tens and hundreds portions
function getCubeOutlineColor(blockValue: number, cubeIndex: number): string | null {
  if (blockValue < 10) {
    return null; // No outline for 1-9
  }

  // For 10-99: tens portion gets outline
  if (blockValue < 100) {
    const tensDigit = Math.floor(blockValue / 10);
    const tensCount = tensDigit * 10;

    if (cubeIndex < tensCount || blockValue === tensCount) {
      if (tensDigit === 7) {
        const column = Math.floor(cubeIndex / 10);
        return getNumberBlockColor(column + 1);
      }
      return getNumberBlockColor(tensDigit);
    }
    return null;
  }

  // For 100-999: hundreds and tens portions get outlines
  if (blockValue < 1000) {
    const hundredsDigit = Math.floor(blockValue / 100);
    const hundredsCount = hundredsDigit * 100;
    const tensDigit = Math.floor((blockValue % 100) / 10);
    const tensCount = tensDigit * 10;

    if (cubeIndex < hundredsCount) {
      // HUNDREDS PORTION: outline of hundreds digit color
      if (hundredsDigit === 7) {
        const column = Math.floor(cubeIndex / 100);
        return getNumberBlockColor(column + 1);
      }
      return getNumberBlockColor(hundredsDigit);
    } else if (cubeIndex < hundredsCount + tensCount) {
      // TENS PORTION: outline of tens digit color
      if (tensDigit === 7) {
        const column = Math.floor((cubeIndex - hundredsCount) / 10);
        return getNumberBlockColor(column + 1);
      }
      return getNumberBlockColor(tensDigit);
    }
    return null; // Units have no outline
  }

  // For 1000+: thousands, hundreds, and tens portions get outlines
  const thousandsDigit = Math.floor(blockValue / 1000);
  const thousandsCount = thousandsDigit * 1000;
  const hundredsDigit = Math.floor((blockValue % 1000) / 100);
  const hundredsCount = hundredsDigit * 100;
  const tensDigit = Math.floor((blockValue % 100) / 10);
  const tensCount = tensDigit * 10;

  if (cubeIndex < thousandsCount) {
    // THOUSANDS PORTION: outline
    if (thousandsDigit === 7) {
      const column = Math.floor(cubeIndex / 1000);
      return getNumberBlockColor(column + 1);
    }
    return getNumberBlockColor(thousandsDigit);
  } else if (cubeIndex < thousandsCount + hundredsCount) {
    // HUNDREDS PORTION: outline
    if (hundredsDigit === 7) {
      const column = Math.floor((cubeIndex - thousandsCount) / 100);
      return getNumberBlockColor(column + 1);
    }
    return getNumberBlockColor(hundredsDigit);
  } else if (cubeIndex < thousandsCount + hundredsCount + tensCount) {
    // TENS PORTION: outline
    const tensIndex = cubeIndex - thousandsCount - hundredsCount;
    if (tensDigit === 7) {
      const column = Math.floor(tensIndex / 10);
      return getNumberBlockColor(column + 1);
    }
    return getNumberBlockColor(tensDigit);
  }

  return null; // Units have no outline
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
