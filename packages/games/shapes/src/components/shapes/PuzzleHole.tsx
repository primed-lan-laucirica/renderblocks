import { motion } from 'framer-motion';
import { ItemRenderer } from '../items/ItemRenderer';
import type { ItemType, ContentClass, Position } from '../../types';

interface PuzzleHoleProps {
  id: string;
  itemType: ItemType;
  contentClass: ContentClass;
  position: Position;
  size: number;
  filled: boolean;
  isHighlighted?: boolean;
}

export function PuzzleHole({
  itemType,
  contentClass,
  position,
  size,
  filled,
  isHighlighted = false,
}: PuzzleHoleProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        height: size,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Glow effect when highlighted */}
      {isHighlighted && !filled && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
          }}
        />
      )}

      {/* The hole (recessed) or filled item */}
      <motion.div
        animate={
          filled
            ? {
                scale: [1, 1.2, 1],
              }
            : {}
        }
        transition={{ duration: 0.3 }}
      >
        <ItemRenderer
          itemType={itemType}
          contentClass={contentClass}
          size={size}
          hole={!filled}
        />
      </motion.div>

      {/* Checkmark when filled */}
      {filled && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
        >
          <svg
            width={size * 0.4}
            height={size * 0.4}
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}

export default PuzzleHole;
