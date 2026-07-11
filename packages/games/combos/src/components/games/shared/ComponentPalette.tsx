import { motion } from 'framer-motion';
import type { ShapeType, ColorType, CountType } from '../../../types';
import { ALL_SHAPES, ALL_COLORS, ALL_COUNTS, COLOR_HEX } from '../../../types';
import { ShapeRenderer } from '../../shapes';
import { playShapeSound, playColorSound, playCountSound } from '../../../utils/sounds';

type PaletteType = 'shape' | 'color' | 'count';

interface ComponentPaletteProps {
  type: PaletteType;
  disabled?: boolean;
  itemSize: number;
  onDrop: (value: ShapeType | ColorType | CountType, dropPoint: { x: number; y: number }) => void;
}

const LABELS: Record<PaletteType, string> = {
  shape: 'Shapes',
  color: 'Colors',
  count: 'Numbers',
};

const ITEM_PADDING = 2;

function ShapeItem({ shape, onDrop, disabled, size }: {
  shape: ShapeType;
  onDrop: (value: ShapeType, dropPoint: { x: number; y: number }) => void;
  disabled: boolean;
  size: number;
}) {
  return (
    <motion.div
      drag={!disabled}
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={() => {
        if (!disabled) playShapeSound(shape);
      }}
      onDragEnd={(_, info) => {
        if (disabled) return;
        onDrop(shape, { x: info.point.x, y: info.point.y });
      }}
      whileDrag={{ scale: 1.3, zIndex: 50 }}
      className={`flex items-center justify-center cursor-grab active:cursor-grabbing ${
        disabled ? 'opacity-30 cursor-not-allowed' : ''
      }`}
      style={{ width: size + ITEM_PADDING, height: size + ITEM_PADDING, touchAction: 'none' }}
    >
      <ShapeRenderer shapeType={shape} size={size} color="#888888" />
    </motion.div>
  );
}

function ColorItem({ color, onDrop, disabled, size }: {
  color: ColorType;
  onDrop: (value: ColorType, dropPoint: { x: number; y: number }) => void;
  disabled: boolean;
  size: number;
}) {
  const hex = COLOR_HEX[color];
  const needsBorder = color === 'white' || color === 'black';

  return (
    <motion.div
      drag={!disabled}
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={() => {
        if (!disabled) playColorSound(color);
      }}
      onDragEnd={(_, info) => {
        if (disabled) return;
        onDrop(color, { x: info.point.x, y: info.point.y });
      }}
      whileDrag={{ scale: 1.3, zIndex: 50 }}
      className={`flex items-center justify-center cursor-grab active:cursor-grabbing ${
        disabled ? 'opacity-30 cursor-not-allowed' : ''
      }`}
      style={{ width: size + ITEM_PADDING, height: size + ITEM_PADDING, touchAction: 'none' }}
    >
      <div
        className={`rounded-full ${needsBorder ? 'border-2 border-gray-400' : ''}`}
        style={{ width: size, height: size, backgroundColor: hex }}
      />
    </motion.div>
  );
}

function CountItem({ count, onDrop, disabled, size }: {
  count: CountType;
  onDrop: (value: CountType, dropPoint: { x: number; y: number }) => void;
  disabled: boolean;
  size: number;
}) {
  return (
    <motion.div
      drag={!disabled}
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={() => {
        if (!disabled) playCountSound(count);
      }}
      onDragEnd={(_, info) => {
        if (disabled) return;
        onDrop(count, { x: info.point.x, y: info.point.y });
      }}
      whileDrag={{ scale: 1.3, zIndex: 50 }}
      className={`flex items-center justify-center cursor-grab active:cursor-grabbing ${
        disabled ? 'opacity-30 cursor-not-allowed' : ''
      }`}
      style={{ width: size + ITEM_PADDING, height: size + ITEM_PADDING, touchAction: 'none' }}
    >
      <span className="font-bold text-gray-700" style={{ fontSize: size * 0.6 }}>{count}</span>
    </motion.div>
  );
}

export function ComponentPalette({ type, disabled = false, itemSize, onDrop }: ComponentPaletteProps) {
  return (
    <div className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex-1 min-w-0">
      {/* Label */}
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center py-0.5 bg-gray-50 border-b border-gray-200">
        {LABELS[type]}
      </div>
      {/* Items */}
      <div className="flex flex-wrap items-center justify-center gap-0.5 p-1">
        {type === 'shape' && ALL_SHAPES.map(shape => (
          <ShapeItem
            key={shape}
            shape={shape}
            onDrop={onDrop as (value: ShapeType, dropPoint: { x: number; y: number }) => void}
            disabled={disabled}
            size={itemSize}
          />
        ))}
        {type === 'color' && ALL_COLORS.map(color => (
          <ColorItem
            key={color}
            color={color}
            onDrop={onDrop as (value: ColorType, dropPoint: { x: number; y: number }) => void}
            disabled={disabled}
            size={itemSize}
          />
        ))}
        {type === 'count' && ALL_COUNTS.map(count => (
          <CountItem
            key={count}
            count={count}
            onDrop={onDrop as (value: CountType, dropPoint: { x: number; y: number }) => void}
            disabled={disabled}
            size={itemSize}
          />
        ))}
      </div>
    </div>
  );
}
