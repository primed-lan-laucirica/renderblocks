import { useRef, useCallback, useState } from 'react';
import { ItemPiece } from '../items/ItemPiece';
import { PuzzleHole } from './PuzzleHole';
import type { Puzzle, ItemPiece as ItemPieceType, PuzzleHole as PuzzleHoleType, Position, ItemType } from '../../types';
import { playSnapSound, playWrongSound } from '../../utils/sounds';

interface PuzzleCanvasProps {
  puzzle: Puzzle;
  pieces: ItemPieceType[];
  onPieceMove: (id: string, position: Position) => void;
  onPieceRemove: (id: string) => void;
  onHoleFilled: (holeId: string) => void;
  shapeSize: number;
}

// Snap threshold in vmin equivalent (8% for easier touch snapping)
const SNAP_THRESHOLD_RATIO = 0.08;

export function PuzzleCanvas({
  puzzle,
  pieces,
  onPieceMove,
  onPieceRemove,
  onHoleFilled,
  shapeSize,
}: PuzzleCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightedHoleId, setHighlightedHoleId] = useState<string | null>(null);

  // Calculate snap threshold based on viewport
  const snapThreshold = Math.min(window.innerWidth, window.innerHeight) * SNAP_THRESHOLD_RATIO;

  // Find nearest unfilled hole for a given position and item type
  const findMatchingHole = useCallback(
    (position: Position, itemType: ItemType): PuzzleHoleType | null => {
      let nearestHole: PuzzleHoleType | null = null;
      let nearestDistance = Infinity;

      for (const hole of puzzle.holes) {
        if (hole.filled) continue;

        const distance = Math.sqrt(
          Math.pow(position.x - hole.position.x, 2) +
          Math.pow(position.y - hole.position.y, 2)
        );

        if (distance < snapThreshold && distance < nearestDistance) {
          // Check if item matches
          if (hole.itemType === itemType) {
            nearestDistance = distance;
            nearestHole = hole;
          }
        }
      }

      return nearestHole;
    },
    [puzzle.holes, snapThreshold]
  );

  // Find any hole near position (for wrong item feedback, including filled holes)
  const findAnyNearbyHole = useCallback(
    (position: Position): PuzzleHoleType | null => {
      for (const hole of puzzle.holes) {
        const distance = Math.sqrt(
          Math.pow(position.x - hole.position.x, 2) +
          Math.pow(position.y - hole.position.y, 2)
        );

        if (distance < snapThreshold) {
          return hole;
        }
      }
      return null;
    },
    [puzzle.holes, snapThreshold]
  );

  const handleDragStart = useCallback((_pieceId: string) => {
    // Could track dragging state here if needed
  }, []);

  const handleDrag = useCallback(
    (pieceId: string, position: Position) => {
      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      // Check for nearby matching hole to highlight
      const matchingHole = findMatchingHole(position, piece.itemType);
      setHighlightedHoleId(matchingHole?.id || null);
    },
    [pieces, findMatchingHole]
  );

  const handleDragEnd = useCallback(
    (pieceId: string, position: Position) => {
      setHighlightedHoleId(null);

      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      // Get canvas bounds
      const container = containerRef.current;
      const canvasHeight = container?.clientHeight || window.innerHeight;
      const canvasWidth = container?.clientWidth || window.innerWidth;

      // Check if dropped outside canvas bounds (into palette area or off-screen)
      const margin = shapeSize / 2;
      if (
        position.y > canvasHeight - margin ||
        position.y < margin ||
        position.x < margin ||
        position.x > canvasWidth - margin
      ) {
        // Dropped outside canvas - remove piece
        onPieceRemove(pieceId);
        return;
      }

      // Check for matching hole (correct item)
      const matchingHole = findMatchingHole(position, piece.itemType);
      if (matchingHole) {
        // Correct item - snap and fill
        playSnapSound();
        onHoleFilled(matchingHole.id);
        onPieceRemove(pieceId);
        return;
      }

      // Check for any nearby hole (wrong item)
      const anyHole = findAnyNearbyHole(position);
      if (anyHole) {
        // Wrong item - play error sound and remove piece
        playWrongSound();
        onPieceRemove(pieceId);
        return;
      }

      // Dropped in empty space within bounds - keep piece at new position
      onPieceMove(pieceId, position);
    },
    [pieces, findMatchingHole, findAnyNearbyHole, onHoleFilled, onPieceRemove, onPieceMove, shapeSize]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Puzzle holes */}
      {puzzle.holes.map((hole) => (
        <PuzzleHole
          key={hole.id}
          id={hole.id}
          itemType={hole.itemType}
          contentClass={puzzle.contentClass}
          position={hole.position}
          size={shapeSize}
          filled={hole.filled}
          isHighlighted={highlightedHoleId === hole.id}
        />
      ))}

      {/* Draggable pieces */}
      {pieces.map((piece) => (
        <ItemPiece
          key={piece.id}
          id={piece.id}
          itemType={piece.itemType}
          contentClass={puzzle.contentClass}
          position={piece.position}
          size={shapeSize}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}

export default PuzzleCanvas;
