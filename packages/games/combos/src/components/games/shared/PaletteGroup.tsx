import { useRef, useState, useEffect } from 'react';

interface PaletteGroupProps {
  children: React.ReactNode;
  onItemSize: (size: number) => void;
  paletteCount: 2 | 3;
}

const MAX_ITEM_SIZE = 44;
const MIN_ITEM_SIZE = 20;

// Max items in any single palette (shapes = 13)
const MAX_ITEMS_PER_PALETTE = 13;

export function PaletteGroup({ children, onItemSize, paletteCount }: PaletteGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const landscape = w > h;
      setIsLandscape(landscape);

      // Calculate item size based on available space
      const containerWidth = containerRef.current.clientWidth;

      if (landscape) {
        // Landscape: palettes side by side. Each palette gets ~1/N of the width.
        // Items wrap within each palette column.
        const perPalette = (containerWidth - (paletteCount - 1) * 8) / paletteCount;
        // Fit items per row: aim for shapes (13) in ~2 rows = ~7 per row
        const itemsPerRow = Math.ceil(MAX_ITEMS_PER_PALETTE / 2);
        const size = Math.floor((perPalette - 16) / itemsPerRow) - 4; // padding/gaps
        onItemSize(Math.max(MIN_ITEM_SIZE, Math.min(MAX_ITEM_SIZE, size)));
      } else {
        // Portrait: palettes stacked. Each palette gets the full width.
        // Try to fit all items in one row for shapes (13).
        const size = Math.floor((containerWidth - 20) / MAX_ITEMS_PER_PALETTE) - 4;
        onItemSize(Math.max(MIN_ITEM_SIZE, Math.min(MAX_ITEM_SIZE, size)));
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [paletteCount, onItemSize]);

  return (
    <div
      ref={containerRef}
      className={`flex gap-2 p-2 pb-6 ${
        isLandscape ? 'flex-row' : 'flex-col'
      }`}
    >
      {children}
    </div>
  );
}
