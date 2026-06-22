import { motion } from 'framer-motion';
import { forwardRef } from 'react';

interface TrashCanProps {
  className?: string;
}

// Big Tum - blob with eye stalks and angular > mouth (vh-based sizing)
function BigTumIcon({ isEating }: { isEating: boolean }) {
  return (
    <div className="trash-icon">
      <svg
        viewBox="0 0 64 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Body - blob/ghost shape */}
        <path
          d="M8 30
             C8 15, 20 8, 32 8
             C44 8, 56 15, 56 30
             L56 65
             C56 70, 52 72, 48 68
             C44 72, 40 68, 36 72
             C32 68, 28 72, 24 68
             C20 72, 16 68, 12 72
             C8 68, 8 65, 8 65
             Z"
          fill="#4ADE80"
          stroke="#22C55E"
          strokeWidth="2"
        />

        {/* Eye stalks */}
        <ellipse cx="20" cy="12" rx="4" ry="10" fill="#4ADE80" stroke="#22C55E" strokeWidth="1" />
        <ellipse cx="44" cy="12" rx="4" ry="10" fill="#4ADE80" stroke="#22C55E" strokeWidth="1" />

        {/* Eyes on stalks */}
        <circle cx="20" cy="6" r="5" fill="white" stroke="#374151" strokeWidth="1" />
        <circle cx="44" cy="6" r="5" fill="white" stroke="#374151" strokeWidth="1" />
        <circle cx="20" cy="6" r="2.5" fill="#374151" />
        <circle cx="44" cy="6" r="2.5" fill="#374151" />

        {/* Angular > mouth */}
        <motion.g
          animate={{ scale: isEating ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.2 }}
        >
          <path
            d="M12 28 L40 42 L12 56"
            stroke="#1a1a1a"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </motion.g>

        {/* Mouth interior when eating */}
        {isEating && (
          <path
            d="M12 28 L40 42 L12 56 Z"
            fill="#DC2626"
            opacity="0.6"
          />
        )}
      </svg>
    </div>
  );
}

export const TrashCan = forwardRef<HTMLDivElement, TrashCanProps>(
  function TrashCan({ className = '' }, ref) {
    return (
      <motion.div
        ref={ref}
        className={`trash-container relative pointer-events-auto ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {/* Label */}
        <div className="trash-title">
          Trash
        </div>

        {/* Big Tum icon */}
        <div className="trash-content">
          <BigTumIcon isEating={false} />
        </div>
      </motion.div>
    );
  }
);

export default TrashCan;
