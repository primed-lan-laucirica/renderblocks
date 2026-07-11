import { useMemo } from 'react';
import type { GameCard } from '../../types';
import { calculateGridDimensions } from '../../utils/layout';
import { Card } from './Card';

interface CardGridProps {
  cards: GameCard[];
  containerWidth: number;
  containerHeight: number;
  onCardClick?: (cardId: string) => void;
  allFaceUp?: boolean;
  selectedCardIds?: string[];
}

export function CardGrid({
  cards,
  containerWidth,
  containerHeight,
  onCardClick,
  allFaceUp = false,
  selectedCardIds = [],
}: CardGridProps) {
  const grid = useMemo(
    () => calculateGridDimensions(containerWidth, containerHeight, cards.length),
    [containerWidth, containerHeight, cards.length],
  );

  return (
    <div
      className="grid place-items-center"
      style={{
        gridTemplateColumns: `repeat(${grid.cols}, ${grid.cardWidth}px)`,
        gap: grid.gap,
        justifyContent: 'center',
        alignContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      {cards.map((card) => {
        const isFaceUp = allFaceUp || card.state === 'face-up' || card.state === 'matched';
        const isRemoved = card.state === 'removed';
        const isMatched = card.state === 'matched';

        if (isRemoved) {
          // Invisible placeholder to keep grid layout stable
          return (
            <div
              key={card.id}
              style={{ width: grid.cardWidth, height: grid.cardHeight }}
            />
          );
        }

        return (
          <Card
            key={card.id}
            combo={card.combo}
            isFaceUp={isFaceUp}
            width={grid.cardWidth}
            height={grid.cardHeight}
            onClick={() => onCardClick?.(card.id)}
            isMatched={isMatched}
            isSelected={selectedCardIds.includes(card.id)}
          />
        );
      })}
    </div>
  );
}
