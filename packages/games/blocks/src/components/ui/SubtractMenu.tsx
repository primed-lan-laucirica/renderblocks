import { motion } from 'framer-motion';
import { useEffect, useRef, useCallback, useState, useLayoutEffect } from 'react';
import { getNumberBlockColor } from '../../types';

interface SubtractMenuProps {
  blockValue: number;
  position: { x: number; y: number };
  onSelect: (value: number) => void;
  onClose: () => void;
}

export function SubtractMenu({ blockValue, position, onSelect, onClose }: SubtractMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [adjustedStyle, setAdjustedStyle] = useState<{
    left: number;
    top: number;
    scale: number;
  }>({ left: position.x, top: position.y, scale: 1 });

  // Debounced select to prevent double-taps
  const handleSelect = useCallback((value: number) => {
    if (isSelecting) return;
    setIsSelecting(true);
    onSelect(value);
  }, [isSelecting, onSelect]);

  // Calculate bounds-safe position and scale after render
  useLayoutEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const menuWidth = rect.width;
    const menuHeight = rect.height;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;

    // Start with requested position (centered)
    let left = position.x;
    let top = position.y;
    let scale = 1;

    // Calculate if menu fits at scale 1
    const halfWidth = menuWidth / 2;
    const halfHeight = menuHeight / 2;

    // Check if we need to scale down to fit
    const maxAvailableWidth = viewportWidth - margin * 2;
    const maxAvailableHeight = viewportHeight - margin * 2;

    if (menuWidth > maxAvailableWidth || menuHeight > maxAvailableHeight) {
      const scaleX = maxAvailableWidth / menuWidth;
      const scaleY = maxAvailableHeight / menuHeight;
      scale = Math.min(scaleX, scaleY, 1);
    }

    // Adjust for scaled dimensions
    const scaledHalfWidth = halfWidth * scale;
    const scaledHalfHeight = halfHeight * scale;

    // Clamp position to keep menu in bounds
    left = Math.max(margin + scaledHalfWidth, Math.min(left, viewportWidth - margin - scaledHalfWidth));
    top = Math.max(margin + scaledHalfHeight, Math.min(top, viewportHeight - margin - scaledHalfHeight));

    setAdjustedStyle({ left, top, scale });
  }, [position.x, position.y]);

  // Close on click/touch outside
  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Delay adding listener to avoid catching the same touch that opened the menu
    const timerId = setTimeout(() => {
      document.addEventListener('pointerdown', handleClickOutside);
    }, 100);
    document.addEventListener('keydown', handleEscape);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Generate options 1 to n-1, capped at 20 for performance
  const maxOptions = Math.min(blockValue - 1, 20);
  const options = Array.from({ length: maxOptions }, (_, i) => i + 1);

  // Calculate grid columns (max 5 per row)
  const cols = Math.min(options.length, 5);
  const isCapped = blockValue > 21;

  return (
    <motion.div
      ref={menuRef}
      className="subtract-menu fixed z-[2000] bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-2xl p-3 backdrop-blur-sm border-2 border-red-400 pointer-events-auto"
      style={{
        left: adjustedStyle.left,
        top: adjustedStyle.top,
        transform: 'translate(-50%, -50%)',
        touchAction: 'manipulation',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: adjustedStyle.scale, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {/* Header */}
      <div className="text-center mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
        Subtract from {blockValue}
      </div>

      {/* Minus sign */}
      <div className="text-center mb-2">
        <span className="inline-block w-8 h-8 bg-red-500 text-white rounded-full text-xl font-bold leading-8">
          −
        </span>
      </div>

      {/* Grid of options */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {options.map((value) => (
          <motion.button
            key={value}
            className="w-10 h-10 rounded-lg font-bold text-gray-900 shadow-md hover:shadow-lg transition-shadow"
            style={{
              backgroundColor: getNumberBlockColor(value),
              boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.2)',
            }}
            onClick={() => handleSelect(value)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {value}
          </motion.button>
        ))}
      </div>

      {/* Result preview */}
      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600 text-center text-xs text-gray-500 dark:text-gray-400">
        {isCapped ? `Showing 1-20 of ${blockValue - 1}` : 'Tap a number to split'}
      </div>
    </motion.div>
  );
}

export default SubtractMenu;
