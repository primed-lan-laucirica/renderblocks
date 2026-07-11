import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { playTickSound } from '../../../utils/sounds';

interface SlotReelItem {
  value: string;
  display: React.ReactNode;
}

interface SlotReelProps {
  items: SlotReelItem[];
  selectedIndex: number;
  spinning: boolean;
  onStop: () => void;
  stopDelay: number;
  label: string;
  itemHeight: number;
}

export function SlotReel({
  items,
  selectedIndex,
  spinning,
  onStop,
  stopDelay,
  label,
  itemHeight,
}: SlotReelProps) {
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'stopping'>('idle');
  const stopTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const totalHeight = items.length * itemHeight;

  // Start spinning when prop changes
  useEffect(() => {
    if (spinning && phase === 'idle') {
      setPhase('spinning');
      // Schedule stop after delay
      stopTimerRef.current = setTimeout(() => {
        setPhase('stopping');
      }, stopDelay);
    }
    if (!spinning && phase !== 'idle') {
      setPhase('idle');
    }
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, [spinning]);

  // Play tick sound while spinning
  useEffect(() => {
    if (phase === 'spinning') {
      playTickSound();
      tickIntervalRef.current = setInterval(() => {
        playTickSound();
      }, 150);
    } else {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = undefined;
      }
    }
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, [phase]);

  // Notify parent when stopping animation completes
  const handleAnimationComplete = () => {
    if (phase === 'stopping') {
      setPhase('idle');
      onStop();
    }
  };

  const targetY = -selectedIndex * itemHeight;

  // Spinning: rapid continuous scrolling via CSS animation
  // Stopping: animate to target position with spring
  const getAnimateProps = () => {
    if (phase === 'spinning') {
      return {
        y: [0, -totalHeight],
        transition: {
          y: {
            duration: 0.3,
            repeat: Infinity,
            ease: 'linear' as const,
          },
        },
      };
    }
    if (phase === 'stopping') {
      return {
        y: targetY,
        transition: {
          type: 'spring' as const,
          stiffness: 120,
          damping: 14,
          mass: 1,
        },
      };
    }
    // Idle
    return {
      y: targetY,
      transition: { duration: 0 },
    };
  };

  const animProps = getAnimateProps();

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <div
        className="relative overflow-hidden rounded-xl bg-white border-2 border-gray-300 shadow-inner"
        style={{ width: itemHeight * 1.2, height: itemHeight }}
      >
        <motion.div
          className="absolute w-full"
          animate={animProps}
          onAnimationComplete={handleAnimationComplete}
        >
          {/* Duplicate items for seamless looping during spin */}
          {[...items, ...items].map((item, i) => (
            <div
              key={`${item.value}-${i}`}
              className="flex items-center justify-center"
              style={{ height: itemHeight }}
            >
              {item.display}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
