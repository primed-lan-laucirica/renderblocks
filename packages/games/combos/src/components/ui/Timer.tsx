import { motion } from 'framer-motion';

interface TimerProps {
  seconds: number;
  className?: string;
}

export function Timer({ seconds, className = '' }: TimerProps) {
  const isWarning = seconds <= 20 && seconds > 10;
  const isCritical = seconds <= 10;

  // Format seconds as MM:SS
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeString = `${minutes}:${secs.toString().padStart(2, '0')}`;

  return (
    <motion.div
      className={`font-mono font-bold rounded-lg px-4 py-2 ${className}`}
      animate={
        isCritical
          ? {
              scale: [1, 1.1, 1],
              backgroundColor: ['#ef4444', '#dc2626', '#ef4444'],
            }
          : isWarning
          ? {
              backgroundColor: '#eab308',
            }
          : {
              backgroundColor: '#3b82f6',
            }
      }
      transition={
        isCritical
          ? {
              duration: 0.5,
              repeat: Infinity,
            }
          : {
              duration: 0.3,
            }
      }
      style={{
        color: 'white',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }}
    >
      <motion.span
        className={`block text-center ${isCritical ? 'text-3xl' : 'text-xl'}`}
        key={seconds}
        initial={isCritical ? { scale: 1.5, opacity: 0 } : {}}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {isCritical ? seconds : timeString}
      </motion.span>
    </motion.div>
  );
}

export default Timer;
