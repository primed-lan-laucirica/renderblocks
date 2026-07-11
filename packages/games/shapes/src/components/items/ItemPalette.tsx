import { useRef } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { ItemRenderer } from './ItemRenderer';
import {
  ALL_SHAPES,
  ALL_LETTERS,
  ALL_NUMBERS,
  type ItemType,
  type ContentClass,
  type Position
} from '../../types';
import { playItemSound } from '../../utils/sounds';

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface ItemPaletteProps {
  contentClass: ContentClass;
  onItemDrop: (itemType: ItemType, position: Position) => void;
  itemSize: number;
  availableItems: Set<ItemType>;
  disabled?: boolean;
}

interface PaletteItemProps {
  itemType: ItemType;
  contentClass: ContentClass;
  size: number;
  onDrop: (itemType: ItemType, position: Position) => void;
  available: boolean;
  disabled?: boolean;
}

function PaletteItem({ itemType, contentClass, size, onDrop, available, disabled }: PaletteItemProps) {
  const isDisabled = disabled || !available;

  const handleDragStart = () => {
    if (available) {
      playItemSound(itemType, contentClass);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const dropX = info.point.x;
    const dropY = info.point.y;

    // Only trigger drop if dragged upward out of palette area
    if (info.offset.y < -30) {
      onDrop(itemType, { x: dropX, y: dropY });
    }
  };

  return (
    <motion.div
      className={`flex items-center justify-center pointer-events-auto touch-none ${
        isDisabled ? '' : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{ width: size, height: size }}
      drag={!isDisabled}
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={!isDisabled ? { scale: 1.15, zIndex: 100 } : {}}
      whileHover={!isDisabled ? { scale: 1.05 } : {}}
      whileTap={!isDisabled ? { scale: 0.95 } : {}}
    >
      <ItemRenderer
        itemType={itemType}
        contentClass={contentClass}
        size={size * 0.85}
        inactive={isDisabled}
      />
    </motion.div>
  );
}

// Get items and layout for a content class
function getItemsAndLayout(contentClass: ContentClass): { items: ItemType[][]; } {
  switch (contentClass) {
    case 'shapes':
      // 2 rows of 8 shapes
      return {
        items: [
          ALL_SHAPES.slice(0, 8),
          ALL_SHAPES.slice(8, 16),
        ],
      };
    case 'letters':
      // 3 rows of 9/9/8 letters
      return {
        items: [
          ALL_LETTERS.slice(0, 9),   // A-I
          ALL_LETTERS.slice(9, 18),  // J-R
          ALL_LETTERS.slice(18, 26), // S-Z
        ],
      };
    case 'numbers':
      // 2 rows of 10 numbers
      return {
        items: [
          ALL_NUMBERS.slice(0, 10),
          ALL_NUMBERS.slice(10, 20),
        ],
      };
  }
}

export function ItemPalette({
  contentClass,
  onItemDrop,
  itemSize,
  availableItems,
  disabled = false
}: ItemPaletteProps) {
  const { items } = getItemsAndLayout(contentClass);

  // Track state for detecting new puzzles
  const lastAvailableCountRef = useRef(0);
  const lastContentClassRef = useRef(contentClass);
  const shuffledItemsRef = useRef<ItemType[][] | null>(null);

  // Detect new puzzle: available count increases or content class changes
  const currentAvailableCount = availableItems.size;
  const contentClassChanged = lastContentClassRef.current !== contentClass;
  const newPuzzleStarted = currentAvailableCount > lastAvailableCountRef.current;
  const needsReshuffle = shuffledItemsRef.current === null || contentClassChanged || newPuzzleStarted;

  if (needsReshuffle) {
    if (contentClass === 'shapes') {
      // Shapes stay in order - puzzle holes are shuffled instead
      shuffledItemsRef.current = items;
    } else {
      // Letters and numbers: shuffle palette so kids search for items
      // Puzzle holes show items in sequence order for learning
      const allItems = items.flat();
      const shuffled = shuffleArray(allItems);

      // Split back into rows with same sizes
      const rowSizes = items.map(row => row.length);
      const rows: ItemType[][] = [];
      let offset = 0;
      for (const size of rowSizes) {
        rows.push(shuffled.slice(offset, offset + size));
        offset += size;
      }
      shuffledItemsRef.current = rows;
    }
  }

  lastAvailableCountRef.current = currentAvailableCount;
  lastContentClassRef.current = contentClass;

  const displayItems = shuffledItemsRef.current!;

  return (
    <div className="w-full flex flex-col items-center gap-1 py-1">
      {displayItems.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1">
          {row.map((item) => (
            <PaletteItem
              key={item}
              itemType={item}
              contentClass={contentClass}
              size={itemSize}
              onDrop={onItemDrop}
              available={availableItems.has(item)}
              disabled={disabled}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default ItemPalette;
