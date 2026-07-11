import { motion } from 'framer-motion';
import type { ShapeType, ColorType, CountType } from '../../../types';
import { COLOR_HEX, DICE_PATTERNS } from '../../../types';
import { ShapeRenderer } from '../../shapes';

interface BuildingCanvasProps {
  shape: ShapeType | null;
  color: ColorType | null;
  count: CountType | null;
  isCardComplete: boolean;
  width: number;
  height: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

const NEUTRAL_COLOR = '#888888';

export function BuildingCanvas({
  shape,
  color,
  count,
  isCardComplete,
  width,
  height,
  canvasRef,
}: BuildingCanvasProps) {
  const hexColor = color ? COLOR_HEX[color] : NEUTRAL_COLOR;
  const needsBorder = color === 'white';
  const isEmpty = shape === null && color === null && count === null;

  // Determine what to render on the card
  const renderContent = () => {
    // Empty card
    if (isEmpty) {
      return (
        <div className="flex items-center justify-center w-full h-full text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      );
    }

    // Color only (no shape yet) — show colored border/outline
    if (shape === null && color !== null && count === null) {
      return (
        <div
          className="w-full h-full rounded-lg flex items-center justify-center"
          style={{ border: `6px solid ${hexColor}` }}
        >
          <div className="text-4xl font-bold" style={{ color: hexColor }}>?</div>
        </div>
      );
    }

    // Count only (no shape, no color) — show number digit
    if (shape === null && color === null && count !== null) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <span className="font-bold text-gray-500" style={{ fontSize: Math.min(width, height) * 0.4 }}>
            {count}
          </span>
        </div>
      );
    }

    // Color + Count (no shape) — colored number digit
    if (shape === null && color !== null && count !== null) {
      return (
        <div
          className="w-full h-full rounded-lg flex items-center justify-center"
          style={{ border: `6px solid ${hexColor}` }}
        >
          <span className="font-bold" style={{ fontSize: Math.min(width, height) * 0.4, color: hexColor }}>
            {count}
          </span>
        </div>
      );
    }

    // Shape only (no color, no count) — single gray shape
    if (shape !== null && color === null && count === null) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <ShapeRenderer
            shapeType={shape}
            size={Math.min(width, height) * 0.55}
            color={NEUTRAL_COLOR}
          />
        </div>
      );
    }

    // Shape + Color (no count, or two-word complete) — single colored shape
    if (shape !== null && color !== null && count === null) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <ShapeRenderer
            shapeType={shape}
            size={Math.min(width, height) * 0.55}
            color={hexColor}
          />
        </div>
      );
    }

    // Shape + Count (no color) — dice pattern with gray shapes
    if (shape !== null && color === null && count !== null) {
      return renderDicePattern(shape, NEUTRAL_COLOR, count);
    }

    // All three — full card: dice pattern with colored shapes
    if (shape !== null && color !== null && count !== null) {
      return renderDicePattern(shape, hexColor, count);
    }

    return null;
  };

  const renderDicePattern = (s: ShapeType, c: string, n: CountType) => {
    const positions = DICE_PATTERNS[n];
    const sizeRatios: Record<number, number> = {
      1: 0.55, 2: 0.35, 3: 0.30, 4: 0.28, 5: 0.26,
    };
    const shapeSize = Math.min(width, height) * sizeRatios[n];

    return (
      <div className="relative w-full h-full">
        {positions.map((pos, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <ShapeRenderer shapeType={s} size={shapeSize} color={c} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      ref={canvasRef}
      className={`rounded-xl bg-white shadow-lg mx-auto ${
        needsBorder ? 'border-2 border-gray-300' : ''
      }`}
      style={{
        width,
        height,
        aspectRatio: '3 / 4',
      }}
      animate={isCardComplete ? {
        scale: [1, 1.03, 1],
        boxShadow: [
          '0 4px 6px rgba(0,0,0,0.1)',
          '0 8px 25px rgba(147,51,234,0.3)',
          '0 4px 6px rgba(0,0,0,0.1)',
        ],
      } : undefined}
      transition={{ duration: 0.6 }}
    >
      {renderContent()}
    </motion.div>
  );
}
