import { motion } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';
import { CUBE_SIZE, getNumberBlockColor, type Position } from '../../types';

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

      // Check if dragged far enough from start (threshold of 50px)
      const distance = Math.sqrt(
        Math.pow(info.point.x - startPosRef.current.x, 2) +
          Math.pow(info.point.y - startPosRef.current.y, 2)
      );

      if (distance > 50) {
        // Spawn a new block at the drop position
        onDragOut(value, {
          x: info.point.x - CUBE_SIZE / 2,
          y: info.point.y - CUBE_SIZE / 2,
        });
      }
    },
    [value, onDragOut]
  );

  return (
    <motion.div
      ref={elementRef}
      className="relative cursor-grab active:cursor-grabbing touch-target"
      style={{
        width: CUBE_SIZE,
        height: CUBE_SIZE,
      }}
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
      {/* Cube preview */}
      <div
        className="w-full h-full rounded-lg"
        style={{
          backgroundColor: color,
          boxShadow: `
            inset 0 -3px 0 rgba(0, 0, 0, 0.2),
            inset 0 3px 0 rgba(255, 255, 255, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.2)
          `,
        }}
      >
        {/* Face - eyes and mouth */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          {/* Eyes - 1 has only one eye, 5 has left star eye, 10 has both star eyes */}
          <div className="flex gap-1 -mt-1 items-center">
            {/* Left eye */}
            {value === 5 ? (
              <div className="relative flex items-center justify-center" style={{ width: '14px', height: '18px' }}>
                <div className="absolute inset-0" style={{
                  background: '#0066FF',
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                }} />
                <div className="bg-white rounded-full relative border border-gray-800 z-10" style={{ width: '7px', height: '10px' }}>
                  <div className="absolute bg-gray-800 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '4px', height: '4px' }} />
                </div>
              </div>
            ) : value === 10 ? (
              <div className="relative flex items-center justify-center" style={{ width: '14px', height: '18px' }}>
                <div className="absolute inset-0" style={{
                  background: '#FF0000',
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                }} />
                <div className="bg-white rounded-full relative border border-gray-800 z-10" style={{ width: '7px', height: '10px' }}>
                  <div className="absolute bg-gray-800 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '4px', height: '4px' }} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-full relative border border-gray-800" style={{ width: '9px', height: '13px' }}>
                <div className="absolute w-1 h-1 bg-gray-800 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
            {/* Right eye - normal for 1-9, star for 10 */}
            {value !== 1 && (
              value === 10 ? (
                <div className="relative flex items-center justify-center" style={{ width: '14px', height: '18px' }}>
                  <div className="absolute inset-0" style={{
                    background: '#FF0000',
                    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                  }} />
                  <div className="bg-white rounded-full relative border border-gray-800 z-10" style={{ width: '7px', height: '10px' }}>
                    <div className="absolute bg-gray-800 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '4px', height: '4px' }} />
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-full relative border border-gray-800" style={{ width: '9px', height: '13px' }}>
                  <div className="absolute w-1 h-1 bg-gray-800 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              )
            )}
          </div>
          {/* Mouth - slightly curved, higher on one side */}
          <div
            className={`w-4 h-1 bg-gray-800 ${(value === 5 || value === 10) ? '-mt-1' : 'mt-0.5'}`}
            style={{ borderRadius: '0 0 6px 4px', transform: 'rotate(-3deg)' }}
          />
        </div>

        {/* Value label on top */}
        <div className="spawn-label absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-600">
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
      className={`mirror relative p-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Mirror label */}
      <div className="mirror-label absolute -top-3 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full text-sm font-semibold text-purple-600 shadow-sm">
        Mirror
      </div>

      {/* Spawnable blocks in two rows */}
      <div className="flex flex-col gap-6 pt-4">
        <div className="flex gap-3 items-end">
          {topRow.map((value) => (
            <SpawnableBlock key={value} value={value} onDragOut={onSpawn} />
          ))}
        </div>
        {bottomRow.length > 0 && (
          <div className="flex gap-3 items-end">
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
