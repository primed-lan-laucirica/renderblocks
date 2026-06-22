import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onPress: () => void;
  onRelease: () => void;
  className?: string;
}

// Microphone icon as inline SVG
function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// Microphone off icon
function MicrophoneOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function VoiceButton({
  isListening,
  isSupported,
  onPress,
  onRelease,
  className,
}: VoiceButtonProps) {
  return (
    <div className={cn('relative pointer-events-auto', className)}>
      {/* Pulsing background when listening */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full bg-candy-pink"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.2, 0.5],
            }}
            exit={{ scale: 1, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </AnimatePresence>

      <motion.button
        className={cn(
          'relative z-10',
          'w-20 h-20 md:w-24 md:h-24',
          'rounded-full',
          'flex items-center justify-center',
          'shadow-lg',
          'focus:outline-none focus:ring-4 focus:ring-candy-purple/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isListening
            ? 'bg-candy-pink text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        )}
        disabled={!isSupported}
        onPointerDown={onPress}
        onPointerUp={onRelease}
        onPointerLeave={onRelease}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
      >
        {isSupported ? (
          <MicrophoneIcon className="w-10 h-10 md:w-12 md:h-12" />
        ) : (
          <MicrophoneOffIcon className="w-10 h-10 md:w-12 md:h-12" />
        )}
      </motion.button>
    </div>
  );
}

export default VoiceButton;
