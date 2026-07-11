import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playHooraySound } from '../../utils/sounds';

interface CelebrationProps {
  isActive: boolean;
  onComplete?: () => void;
}

interface Confetti {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
}

const CONFETTI_COLORS = [
  '#FF0000', '#FF8C00', '#FFD700', '#00CC00', '#00BFFF',
  '#4B0082', '#8B00FF', '#FF00FF', '#E91E63', '#FFC107',
];

function generateConfetti(count: number): Confetti[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 0.5,
    rotation: Math.random() * 360,
    size: 8 + Math.random() * 12,
  }));
}

export function Celebration({ isActive, onComplete }: CelebrationProps) {
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  useEffect(() => {
    if (isActive) {
      playHooraySound();
      setConfetti(generateConfetti(50));

      // Auto-complete after animation
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setConfetti([]);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Confetti pieces */}
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute top-0"
              style={{
                left: `${piece.x}%`,
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
              initial={{
                y: -20,
                rotate: piece.rotation,
                opacity: 1,
              }}
              animate={{
                y: window.innerHeight + 50,
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2.5 + Math.random(),
                delay: piece.delay,
                ease: 'easeIn',
              }}
            />
          ))}

          {/* Center celebration text */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.div
              className="text-6xl md:text-8xl font-bold text-white text-center"
              style={{
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
              animate={{
                scale: [1, 1.1, 1],
                rotate: [-2, 2, -2],
              }}
              transition={{
                duration: 0.5,
                repeat: 5,
              }}
            >
              <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                Hooray!
              </span>
            </motion.div>
          </motion.div>

          {/* Sparkle effects */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute w-4 h-4"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 0.8,
                delay: 0.5 + i * 0.15,
                repeat: 2,
              }}
            >
              <svg viewBox="0 0 24 24" fill="#FFD700">
                <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
              </svg>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Celebration;
