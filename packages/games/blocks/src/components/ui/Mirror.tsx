import { motion } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';
import { getNumberBlockColor, getBlockDimensions, type Position } from '../../types';

interface MirrorProps {
  /** Values 1-10 to display as spawnable blocks */
  values?: number[];
  /** Called when a block is dragged out of the mirror */
  onSpawn: (value: number, position: Position) => void;
  className?: string;
}

interface SpawnableBlockProps {
  value: number;
  onDragOut: (value: number, position: Position) => void;
}

// Mini block preview that can be dragged to spawn
function SpawnableBlock({ value, onDragOut }: SpawnableBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<Position>({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const color = getNumberBlockColor(value);

  const handleDragStart = useCallback(() => {
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      startPosRef.current = { x: rect.left, y: rect.top };
    }
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: { point: { x: number; y: number } }
    ) => {
      setIsDragging(false);

      // Check if dragged far enough from start (threshold based on viewport)
      const threshold = window.innerHeight * 0.05; // 5vh
      const distance = Math.sqrt(
        Math.pow(info.point.x - startPosRef.current.x, 2) +
          Math.pow(info.point.y - startPosRef.current.y, 2)
      );

      if (distance > threshold) {
        // Spawn a new block at the drop position, oriented by bottom
        const dims = getBlockDimensions(value);

        // Calculate initial position (centered horizontally, bottom at drop point)
        let x = info.point.x - dims.width / 2;
        let y = info.point.y - dims.height;

        // Clamp to screen bounds (with small margin)
        const margin = 10;
        const topMargin = 40; // Account for number label above block
        const maxX = window.innerWidth - dims.width - margin;
        const maxY = window.innerHeight - dims.height - margin;

        x = Math.max(margin, Math.min(x, maxX));
        y = Math.max(topMargin, Math.min(y, maxY));

        onDragOut(value, { x, y });
      }
    },
    [value, onDragOut]
  );

  return (
    <motion.div
      ref={elementRef}
      className="relative cursor-grab active:cursor-grabbing mirror-cube"
      drag
      dragMomentum={false}
      dragElastic={0.5}
      dragSnapToOrigin
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      whileDrag={{ scale: 1.2, zIndex: 100 }}
    >
      {/* Cube preview - uses vh-based sizing via CSS class */}
      <div
        className="mirror-cube-inner"
        style={{
          backgroundColor: color,
        }}
      >
        {/* Face */}
        <div className="mirror-cube-face">
          <div className="mirror-cube-eyes">
            {/* Left eye */}
            {value === 5 ? (
              <div className="mirror-eye-star star-blue">
                <div className="mirror-eye-inner" />
              </div>
            ) : value === 10 ? (
              <div className="mirror-eye-star star-red">
                <div className="mirror-eye-inner" />
              </div>
            ) : (
              <div className="mirror-eye" />
            )}
            {/* Right eye - normal for 5, star for 10, hidden for 1 */}
            {value !== 1 && (
              value === 10 ? (
                <div className="mirror-eye-star star-red">
                  <div className="mirror-eye-inner" />
                </div>
              ) : (
                <div className="mirror-eye" />
              )
            )}
          </div>
          <div className="mirror-mouth" />
        </div>

        {/* Value label on top */}
        <div className="mirror-label-value">
          {value}
        </div>
      </div>

      {/* Ghost when dragging */}
      {isDragging && (
        <div
          className="absolute inset-0 rounded-lg opacity-30"
          style={{ backgroundColor: color }}
        />
      )}
    </motion.div>
  );
}

export function Mirror({
  values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  onSpawn,
  className = '',
}: MirrorProps) {
  // Split values into two rows
  const topRow = values.slice(0, 5);
  const bottomRow = values.slice(5, 10);

  return (
    <motion.div
      className={`mirror-container relative pointer-events-auto ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Mirror label */}
      <div className="mirror-title">
        Mirror
      </div>

      {/* Spawnable blocks in two rows */}
      <div className="mirror-grid">
        <div className="mirror-row">
          {topRow.map((value) => (
            <SpawnableBlock key={value} value={value} onDragOut={onSpawn} />
          ))}
        </div>
        {bottomRow.length > 0 && (
          <div className="mirror-row">
            {bottomRow.map((value) => (
              <SpawnableBlock key={value} value={value} onDragOut={onSpawn} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default Mirror;
