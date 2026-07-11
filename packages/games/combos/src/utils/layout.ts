// Layout calculation utility for card grid positioning

export interface GridDimensions {
  cols: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
  gap: number;
}

/**
 * Calculate optimal card grid dimensions for a given container.
 * Landscape: Nx2 (wide). Portrait: 2xN (tall).
 * Card aspect ratio is 3:4 (width:height).
 */
export function calculateGridDimensions(
  containerWidth: number,
  containerHeight: number,
  cardCount: number = 20,
): GridDimensions {
  const isLandscape = containerWidth > containerHeight;
  const cols = isLandscape ? Math.ceil(cardCount / 2) : 2;
  const rows = Math.ceil(cardCount / cols);

  const gapRatio = 0.02; // 2% of smaller dimension
  const gap = Math.max(4, Math.min(containerWidth, containerHeight) * gapRatio);

  // Available space after gaps
  const availableWidth = containerWidth - gap * (cols + 1);
  const availableHeight = containerHeight - gap * (rows + 1);

  // Card aspect ratio 3:4
  const cardAspect = 3 / 4;
  const maxCardWidth = availableWidth / cols;
  const maxCardHeight = availableHeight / rows;

  let cardWidth: number;
  let cardHeight: number;

  if (maxCardWidth / cardAspect <= maxCardHeight) {
    // Width-constrained
    cardWidth = maxCardWidth;
    cardHeight = cardWidth / cardAspect;
  } else {
    // Height-constrained
    cardHeight = maxCardHeight;
    cardWidth = cardHeight * cardAspect;
  }

  return { cols, rows, cardWidth, cardHeight, gap };
}
