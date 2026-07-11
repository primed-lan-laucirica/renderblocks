import type { LetterType, NumberType } from '../../types';
import { LETTER_COLORS, NUMBER_COLORS } from '../../types';

interface TextItemRendererProps {
  itemType: LetterType | NumberType;
  contentClass: 'letters' | 'numbers';
  size: number;
  color?: string;
  hole?: boolean;
  inactive?: boolean;
  className?: string;
}

// Darken a hex color for hole effect
function darkenColor(hex: string, amount: number = 0.3): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.floor((num >> 16) * (1 - amount));
  const g = Math.floor(((num >> 8) & 0x00ff) * (1 - amount));
  const b = Math.floor((num & 0x0000ff) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

// Consistent dark gray for inactive items
const INACTIVE_COLOR = '#3a3a3a';

export function TextItemRenderer({
  itemType,
  contentClass,
  size,
  color,
  hole = false,
  inactive = false,
  className = '',
}: TextItemRendererProps) {
  // Get the color for this item
  const baseColor = color || (
    contentClass === 'letters'
      ? LETTER_COLORS[itemType as LetterType]
      : NUMBER_COLORS[itemType as NumberType]
  );

  // Determine font size - smaller for 2-digit numbers
  const isDoubleDigit = contentClass === 'numbers' && itemType.length > 1;
  const fontSize = isDoubleDigit ? 70 : 85;

  // Inactive mode: dark gray text shape
  if (inactive) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={className}
        style={{ display: 'block' }}
      >
        <text
          x="50"
          y="54"
          textAnchor="middle"
          dominantBaseline="central"
          fill={INACTIVE_COLOR}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={1}
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {itemType}
        </text>
      </svg>
    );
  }

  // Hole mode: dark text shape with outline glow
  if (hole) {
    const holeColor = darkenColor(baseColor, 0.8);
    const filterId = `hole-shadow-text-${itemType}`;

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
        {/* White outer glow for visibility */}
        <text
          x="50"
          y="54"
          textAnchor="middle"
          dominantBaseline="central"
          fill="none"
          stroke="white"
          strokeWidth={8}
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          filter={`url(#${filterId})`}
        >
          {itemType}
        </text>
        {/* Dark fill with subtle color */}
        <text
          x="50"
          y="54"
          textAnchor="middle"
          dominantBaseline="central"
          fill={holeColor}
          stroke="rgba(0,0,0,0.9)"
          strokeWidth={2}
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {itemType}
        </text>
        {/* Inner highlight for 3D recess effect */}
        <text
          x="50"
          y="54"
          textAnchor="middle"
          dominantBaseline="central"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {itemType}
        </text>
      </svg>
    );
  }

  // Normal filled mode: colored text shape
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ display: 'block' }}
    >
      <text
        x="50"
        y="54"
        textAnchor="middle"
        dominantBaseline="central"
        fill={baseColor}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth={2}
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {itemType}
      </text>
    </svg>
  );
}

export default TextItemRenderer;
