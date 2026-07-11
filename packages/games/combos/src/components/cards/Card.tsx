import { motion } from 'framer-motion';
import type { Combo } from '../../types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';

interface CardProps {
  combo: Combo;
  isFaceUp: boolean;
  width: number;
  height: number;
  onClick?: () => void;
  isMatched?: boolean;
  isSelected?: boolean;
}

export function Card({ combo, isFaceUp, width, height, onClick, isMatched = false, isSelected = false }: CardProps) {
  return (
    <motion.div
      className="cursor-pointer"
      style={{
        width,
        height,
        perspective: 800,
        touchAction: 'manipulation',
        borderRadius: 12,
        boxShadow: isSelected ? '0 0 0 4px #a855f7' : undefined,
      }}
      onPointerDown={() => onClick?.()}
      animate={isMatched ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
      transition={isMatched ? { duration: 0.4, ease: 'easeIn' } : undefined}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFaceUp ? 0 : 180 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <CardFace combo={combo} width={width} height={height} />
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <CardBack width={width} height={height} />
        </div>
      </motion.div>
    </motion.div>
  );
}
