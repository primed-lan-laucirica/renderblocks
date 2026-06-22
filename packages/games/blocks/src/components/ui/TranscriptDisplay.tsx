import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface TranscriptDisplayProps {
  transcript: string;
  isListening: boolean;
  className?: string;
}

export function TranscriptDisplay({
  transcript,
  isListening,
  className,
}: TranscriptDisplayProps) {
  const hasText = transcript.length > 0;

  return (
    <AnimatePresence mode="wait">
      {(hasText || isListening) && (
        <motion.div
          className={cn(
            'bg-white/90 backdrop-blur-sm',
            'rounded-2xl',
            'px-6 py-4',
            'shadow-playful',
            'max-w-md',
            className
          )}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {hasText ? (
            <p className="text-lg md:text-xl text-gray-800 font-medium">
              "{transcript}"
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Listening</span>
              <motion.span
                className="flex gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 bg-candy-pink rounded-full"
                    animate={{
                      y: [0, -6, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </motion.span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TranscriptDisplay;
