import { motion, type PanInfo } from 'framer-motion';
import { ShapeRenderer } from './ShapeRenderer';
import type { ShapeType, Position } from '../../types';

interface ShapePieceProps {
  id: string;
  shapeType: ShapeType;
  position: Position;
  size: number;
  onDragStart?: (id: string) => void;
  onDrag?: (id: string, position: Position) => void;
  onDragEnd?: (id: string, position: Position) => void;
}

export function ShapePiece({
  id,
  shapeType,
  position,
  size,
  onDragStart,
  onDrag,
  onDragEnd,
}: ShapePieceProps) {
  const handleDragStart = () => {
    // Shape name is only played from palette, not on subsequent drags
    onDragStart?.(id);
  };

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    onDrag?.(id, {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    });
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    onDragEnd?.(id, {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    });
  };

  return (
    <motion.div
      className="absolute cursor-grab active:cursor-grabbing touch-none"
      style={{
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        height: size,
      }}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileDrag={{
        scale: 1.15,
        zIndex: 100,
      }}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div
        className="w-full h-full transition-shadow duration-200"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
        }}
      >
        <ShapeRenderer shapeType={shapeType} size={size} />
      </div>
    </motion.div>
  );
}

export default ShapePiece;
