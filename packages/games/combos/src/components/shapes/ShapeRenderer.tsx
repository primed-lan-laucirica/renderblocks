import type { ShapeType } from '../../types';

interface ShapeRendererProps {
  shapeType: ShapeType;
  size: number;
  color: string;
  outline?: boolean;
  hole?: boolean;
  inactive?: boolean;
  className?: string;
}

// Slightly darken a hex color for the hole effect
function darkenColor(hex: string, amount: number = 0.3): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.floor((num >> 16) * (1 - amount));
  const g = Math.floor(((num >> 8) & 0x00ff) * (1 - amount));
  const b = Math.floor((num & 0x0000ff) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

// SVG path data for each shape (centered in 100x100 viewBox)
const SHAPE_PATHS: Record<ShapeType, string> = {
  circle: 'M 50 5 A 45 45 0 1 1 50 95 A 45 45 0 1 1 50 5',
  hexagon: 'M 50 5 L 93 27.5 L 93 72.5 L 50 95 L 7 72.5 L 7 27.5 Z',
  square: 'M 10 10 L 90 10 L 90 90 L 10 90 Z',
  rectangle: 'M 5 20 L 95 20 L 95 80 L 5 80 Z',
  pentagon: 'M 50 5 L 97 38 L 79 95 L 21 95 L 3 38 Z',
  triangle: 'M 50 5 L 95 95 L 5 95 Z',
  octagon: 'M 30 5 L 70 5 L 95 30 L 95 70 L 70 95 L 30 95 L 5 70 L 5 30 Z',
  oval: 'M 50 22 A 43 28 0 1 1 50 78 A 43 28 0 1 1 50 22',
  heart: 'M 50 88 C 20 60 5 40 5 25 A 20 20 0 0 1 50 25 A 20 20 0 0 1 95 25 C 95 40 80 60 50 88 Z',
  cross: 'M 35 5 L 65 5 L 65 35 L 95 35 L 95 65 L 65 65 L 65 95 L 35 95 L 35 65 L 5 65 L 5 35 L 35 35 Z',
  star: 'M 50 5 L 61 39 L 97 39 L 68 61 L 79 95 L 50 73 L 21 95 L 32 61 L 3 39 L 39 39 Z',
  diamond: 'M 50 5 L 95 50 L 50 95 L 5 50 Z',
  arrow: 'M 50 5 L 85 40 L 65 40 L 65 95 L 35 95 L 35 40 L 15 40 Z',
};

const INACTIVE_COLOR = '#3a3a3a';

export function ShapeRenderer({
  shapeType,
  size,
  color,
  outline = false,
  hole = false,
  inactive = false,
  className = '',
}: ShapeRendererProps) {
  const path = SHAPE_PATHS[shapeType];

  if (inactive) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={className}
        style={{ display: 'block' }}
      >
        <path
          d={path}
          fill={INACTIVE_COLOR}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={2}
        />
      </svg>
    );
  }

  if (hole) {
    const holeColor = darkenColor(color, 0.8);
    const filterId = `hole-shadow-${shapeType}`;

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={className}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="black" floodOpacity="0.6" />
          </filter>
        </defs>
        <path
          d={path}
          fill="none"
          stroke="white"
          strokeWidth={6}
          filter={`url(#${filterId})`}
        />
        <path
          d={path}
          fill={holeColor}
          stroke="rgba(0,0,0,0.9)"
          strokeWidth={2}
        />
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />
      </svg>
    );
  }

  if (outline) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={className}
        style={{ display: 'block' }}
      >
        <path
          d={path}
          fill="transparent"
          stroke={color}
          strokeWidth={3}
          strokeDasharray="8 4"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ display: 'block' }}
    >
      <path
        d={path}
        fill={color}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth={2}
      />
    </svg>
  );
}

export default ShapeRenderer;
