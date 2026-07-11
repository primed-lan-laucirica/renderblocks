import type { Combo } from '../../types';
import { COLOR_HEX } from '../../types';
import { ShapeRenderer } from '../shapes';
import { DiceLayout } from './DiceLayout';

interface CardFaceProps {
  combo: Combo;
  width: number;
  height: number;
}

export function CardFace({ combo, width, height }: CardFaceProps) {
  const color = COLOR_HEX[combo.color];

  // Add a visible border for white shapes so they don't disappear on white cards
  const needsBorder = combo.color === 'white';

  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-white shadow-md ${
        needsBorder ? 'border-2 border-gray-300' : ''
      }`}
      style={{ width, height }}
    >
      {combo.type === 'two-word' ? (
        <ShapeRenderer
          shapeType={combo.shape}
          size={Math.min(width, height) * 0.65}
          color={color}
        />
      ) : (
        <DiceLayout
          count={combo.count}
          shape={combo.shape}
          color={color}
          cardWidth={width}
          cardHeight={height}
        />
      )}
    </div>
  );
}
