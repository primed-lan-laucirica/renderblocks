import { useState, useCallback, useRef, useEffect } from 'react';
import {
  type NumberBlock,
  type Position,
  type BoundingBox,
  getBlockDimensions,
} from '../types';
import { playAdditionSound, playSubtractionSound } from '../utils';

interface PendingCombination {
  draggingId: string;
  targetId: string;
  position: Position;
}

function generateId(): string {
  return crypto.randomUUID();
}

function getBoxAtPosition(value: number, position: Position): BoundingBox {
  const dims = getBlockDimensions(value);
  return { x: position.x, y: position.y, width: dims.width, height: dims.height };
}

function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function useNumberBlocks() {
  const [blocks, setBlocks] = useState<NumberBlock[]>([]);
  const [pendingCombination, setPendingCombination] = useState<PendingCombination | null>(null);

  // Keep a ref in sync with state for synchronous reads
  const blocksRef = useRef<NumberBlock[]>([]);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const addBlock = useCallback((value: number, position: Position): string => {
    const id = generateId();
    setBlocks(prev => [...prev, { id, value, position, isDragging: false, createdAt: Date.now() }]);
    return id;
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  const updateBlockPosition = useCallback((id: string, position: Position) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, position } : b));
  }, []);

  const startDragging = useCallback((id: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, isDragging: true } : b));
  }, []);

  const stopDragging = useCallback((id: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, isDragging: false } : b));
    setPendingCombination(null);
  }, []);

  const checkOverlap = useCallback((draggedId: string, draggedPos: Position) => {
    const currentBlocks = blocksRef.current;
    const draggedBlock = currentBlocks.find(b => b.id === draggedId);

    if (!draggedBlock) {
      setPendingCombination(null);
      return;
    }

    const draggedBox = getBoxAtPosition(draggedBlock.value, draggedPos);

    // Find collision with any other block
    let foundCollision: PendingCombination | null = null;

    for (const block of currentBlocks) {
      if (block.id === draggedId) continue;
      const targetBox = getBoxAtPosition(block.value, block.position);

      if (boxesOverlap(draggedBox, targetBox)) {
        foundCollision = {
          draggingId: draggedId,
          targetId: block.id,
          position: {
            x: (draggedBox.x + draggedBox.width / 2 + targetBox.x + targetBox.width / 2) / 2,
            y: Math.min(draggedBox.y, targetBox.y) - 40,
          },
        };
        break;
      }
    }

    setPendingCombination(foundCollision);
  }, []);

  const finalizeCombine = useCallback((draggedId: string, draggedPos: Position): boolean => {
    const currentBlocks = blocksRef.current;
    const draggedBlock = currentBlocks.find(b => b.id === draggedId);

    if (!draggedBlock) {
      setPendingCombination(null);
      return false;
    }

    const draggedBox = getBoxAtPosition(draggedBlock.value, draggedPos);

    // Find collision
    let collidingBlock: NumberBlock | undefined;
    for (const block of currentBlocks) {
      if (block.id === draggedId) continue;
      const targetBox = getBoxAtPosition(block.value, block.position);
      if (boxesOverlap(draggedBox, targetBox)) {
        collidingBlock = block;
        break;
      }
    }

    if (!collidingBlock) {
      setPendingCombination(null);
      return false;
    }

    // Calculate new block properties
    const newValue = draggedBlock.value + collidingBlock.value;
    const collidingBox = getBoxAtPosition(collidingBlock.value, collidingBlock.position);
    const newDims = getBlockDimensions(newValue);

    const centerX = (draggedBox.x + draggedBox.width / 2 + collidingBox.x + collidingBox.width / 2) / 2;
    const centerY = (draggedBox.y + draggedBox.height / 2 + collidingBox.y + collidingBox.height / 2) / 2;

    // Calculate position and clamp to screen bounds
    const margin = 10;
    const topMargin = 40; // Account for number label above block
    const maxX = window.innerWidth - newDims.width - margin;
    const maxY = window.innerHeight - newDims.height - margin;

    let x = centerX - newDims.width / 2;
    let y = centerY - newDims.height / 2;
    x = Math.max(margin, Math.min(x, maxX));
    y = Math.max(topMargin, Math.min(y, maxY));

    const newBlock: NumberBlock = {
      id: generateId(),
      value: newValue,
      position: { x, y },
      isDragging: false,
      createdAt: Date.now(),
    };

    // Update state: remove both, add new
    setBlocks(prev => [
      ...prev.filter(b => b.id !== draggedId && b.id !== collidingBlock!.id),
      newBlock,
    ]);

    // Play addition sound
    playAdditionSound();

    setPendingCombination(null);
    return true;
  }, []);

  const clearBlocks = useCallback(() => {
    setBlocks([]);
    setPendingCombination(null);
  }, []);

  // Split a block into two: (original - subtractValue) and (subtractValue)
  // Set skipSound=true when using custom sound (e.g., sneeze)
  const splitBlock = useCallback((id: string, subtractValue: number, skipSound = false): boolean => {
    const currentBlocks = blocksRef.current;
    const block = currentBlocks.find(b => b.id === id);

    if (!block || subtractValue <= 0 || subtractValue >= block.value) {
      return false;
    }

    const remainingValue = block.value - subtractValue;
    const dims1 = getBlockDimensions(remainingValue);
    const dims2 = getBlockDimensions(subtractValue);

    // Helper to clamp position to screen bounds
    const margin = 10;
    const topMargin = 40; // Account for number label above block
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const clampX = (x: number, width: number): number => {
      const maxX = Math.max(margin, screenWidth - width - margin);
      return Math.max(margin, Math.min(x, maxX));
    };

    const clampY = (y: number, height: number): number => {
      const maxY = Math.max(topMargin, screenHeight - height - margin);
      return Math.max(topMargin, Math.min(y, maxY));
    };

    // Check if both blocks can fit side by side
    const totalWidth = dims1.width + dims2.width + 20; // 20 = gap between blocks
    const totalHeight = dims1.height + dims2.height + 20;
    const canFitHorizontally = totalWidth <= screenWidth - margin * 2;
    const canFitVertically = totalHeight <= screenHeight - topMargin - margin;

    const now = Date.now();
    let pos1: Position;
    let pos2: Position;

    if (canFitHorizontally) {
      // Side by side layout - position relative to original block
      pos1 = {
        x: clampX(block.position.x - 30, dims1.width),
        y: clampY(block.position.y, dims1.height),
      };
      const minX2 = pos1.x + dims1.width + 10;
      pos2 = {
        x: clampX(Math.max(minX2, block.position.x + dims1.width + 10), dims2.width),
        y: clampY(block.position.y, dims2.height),
      };
    } else if (canFitVertically) {
      // Stack vertically on small screens
      pos1 = {
        x: clampX(block.position.x, dims1.width),
        y: clampY(block.position.y, dims1.height),
      };
      // Ensure block2 doesn't overlap with block1
      const minY2 = pos1.y + dims1.height + 10;
      pos2 = {
        x: clampX(block.position.x, dims2.width),
        y: clampY(Math.max(minY2, block.position.y + dims1.height + 20), dims2.height),
      };
    } else {
      // Emergency fallback: place in opposite corners
      pos1 = {
        x: margin,
        y: topMargin,
      };
      pos2 = {
        x: clampX(screenWidth - dims2.width - margin, dims2.width),
        y: clampY(screenHeight - dims2.height - margin, dims2.height),
      };
    }

    const newBlock1: NumberBlock = {
      id: generateId(),
      value: remainingValue,
      position: pos1,
      isDragging: false,
      createdAt: now,
    };

    const newBlock2: NumberBlock = {
      id: generateId(),
      value: subtractValue,
      position: pos2,
      isDragging: false,
      createdAt: now,
    };

    setBlocks(prev => [
      ...prev.filter(b => b.id !== id),
      newBlock1,
      newBlock2,
    ]);

    // Play subtraction sound (unless skipped for custom sound like sneeze)
    if (!skipSound) {
      playSubtractionSound();
    }

    return true;
  }, []);

  return {
    blocks,
    pendingCombination,
    addBlock,
    removeBlock,
    updateBlockPosition,
    startDragging,
    stopDragging,
    checkOverlap,
    finalizeCombine,
    clearBlocks,
    splitBlock,
  };
}

export default useNumberBlocks;
