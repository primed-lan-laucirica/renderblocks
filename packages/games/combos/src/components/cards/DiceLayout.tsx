import type { ShapeType, CountType } from '../../types';
import { DICE_PATTERNS } from '../../types';
import { ShapeRenderer } from '../shapes';

interface DiceLayoutProps {
  count: CountType;
  shape: ShapeType;
  color: string;
  cardWidth: number;
  cardHeight: number;
}

export function DiceLayout({ count, shape, color, cardWidth, cardHeight }: DiceLayoutProps) {
  const positions = DICE_PATTERNS[count];

  // Shape size scales down as count increases
  const sizeRatios: Record<CountType, number> = {
    1: 0.55,
    2: 0.35,
    3: 0.30,
    4: 0.28,
    5: 0.26,
  };
  const shapeSize = Math.min(cardWidth, cardHeight) * sizeRatios[count];

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
          <ShapeRenderer
            shapeType={shape}
            size={shapeSize}
            color={color}
          />
        </div>
      ))}
    </div>
  );
}
