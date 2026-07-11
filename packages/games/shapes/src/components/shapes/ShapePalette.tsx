import { motion, type PanInfo } from 'framer-motion';
import { ShapeRenderer } from './ShapeRenderer';
import { ALL_SHAPES, type ShapeType, type Position } from '../../types';
import { playShapeSound } from '../../utils/sounds';

interface ShapePaletteProps {
  onShapeDrop: (shapeType: ShapeType, position: Position) => void;
  shapeSize: number;
  availableShapes: Set<ShapeType>; // Shapes needed and not yet placed
  disabled?: boolean;
}

interface PaletteShapeProps {
  shapeType: ShapeType;
  size: number;
  onDrop: (shapeType: ShapeType, position: Position) => void;
  available: boolean; // Is this shape needed and not yet placed?
  disabled?: boolean;
}

function PaletteShape({ shapeType, size, onDrop, available, disabled }: PaletteShapeProps) {
  const isDisabled = disabled || !available;

  const handleDragStart = () => {
    if (available) {
      playShapeSound(shapeType);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Use the pointer position directly - this is where the finger/cursor actually is
    const dropX = info.point.x;
    const dropY = info.point.y;

    // Only trigger drop if dragged upward out of palette area (at least 30px up)
    if (info.offset.y < -30) {
      onDrop(shapeType, { x: dropX, y: dropY });
    }
  };

  return (
    <motion.div
      className={`flex items-center justify-center pointer-events-auto touch-none ${
        isDisabled ? '' : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{ width: size, height: size }}
      drag={!isDisabled}
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={!isDisabled ? { scale: 1.15, zIndex: 100 } : {}}
      whileHover={!isDisabled ? { scale: 1.05 } : {}}
      whileTap={!isDisabled ? { scale: 0.95 } : {}}
    >
      <ShapeRenderer shapeType={shapeType} size={size * 0.85} inactive={isDisabled} />
    </motion.div>
  );
}

export function ShapePalette({ onShapeDrop, shapeSize, availableShapes, disabled = false }: ShapePaletteProps) {
  return (
    <div className="w-full flex flex-col items-center gap-1 py-1">
      {/* Row 1: First 8 shapes */}
      <div className="flex justify-center gap-1">
        {ALL_SHAPES.slice(0, 8).map((shape) => (
          <PaletteShape
            key={shape}
            shapeType={shape}
            size={shapeSize}
            onDrop={onShapeDrop}
            available={availableShapes.has(shape)}
            disabled={disabled}
          />
        ))}
      </div>
      {/* Row 2: Last 8 shapes */}
      <div className="flex justify-center gap-1">
        {ALL_SHAPES.slice(8, 16).map((shape) => (
          <PaletteShape
            key={shape}
            shapeType={shape}
            size={shapeSize}
            onDrop={onShapeDrop}
            available={availableShapes.has(shape)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

export default ShapePalette;
