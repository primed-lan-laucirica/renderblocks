// Layout calculation utility for puzzle positioning
// Ensures puzzle holes don't overlap with header or palette

import type { ContentClass } from '../types';

export interface PlayAreaBounds {
  top: number;      // Y coordinate where play area starts
  left: number;     // X coordinate where play area starts
  width: number;    // Width of usable play area
  height: number;   // Height of usable play area
}

/**
 * Calculate the usable play area bounds for puzzle holes.
 *
 * Takes into account:
 * - Header height (logo, timer, controls)
 * - Footer/palette height (varies by content class)
 * - Screen orientation (portrait vs landscape)
 * - Safe margins around edges
 */
export function calculatePlayAreaBounds(
  screenWidth: number,
  screenHeight: number,
  contentClass: ContentClass,
  itemSize: number
): PlayAreaBounds {
  const isLandscape = screenWidth > screenHeight;

  // Header height: includes logo, timer, and padding
  // Roughly 56-64px on most devices
  const headerHeight = 60;

  // Palette configuration by content class
  // - shapes: 2 rows
  // - letters: 3 rows
  // - numbers: 2 rows
  const paletteRows = contentClass === 'letters' ? 3 : 2;

  // Calculate palette height in pixels
  // Each row: itemSize + gap (4px from gap-1 class)
  // Container: py-1 (8px) top/bottom + safe-area-inset-bottom (~16px) + some extra padding
  const rowHeight = itemSize + 4;
  const containerPadding = 8 + 8 + 16; // py-1 top + py-1 bottom + safe-area + buffer
  const paletteHeight = paletteRows * rowHeight + containerPadding;

  // Side margins: percentage based with minimum
  // In landscape we can afford thinner margins, portrait needs more relative space
  const sideMarginPercent = isLandscape ? 0.04 : 0.06;
  const sideMargin = Math.max(16, screenWidth * sideMarginPercent);

  // Buffer space between content and header/palette
  // Larger in portrait to give breathing room, smaller in landscape to maximize space
  const buffer = isLandscape ? itemSize * 0.25 : itemSize * 0.4;

  // Calculate bounds
  const top = headerHeight + buffer;
  const left = sideMargin;
  const width = screenWidth - sideMargin * 2;
  const height = screenHeight - top - paletteHeight - buffer;

  return { top, left, width, height };
}

/**
 * Position items in a grid pattern within play area bounds.
 * Items are distributed evenly within each row, rows distributed vertically.
 */
export function calculateGridPositions(
  rows: unknown[][], // Array of rows, each row is array of items
  bounds: PlayAreaBounds
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const numRows = rows.length;

  if (numRows === 0) return positions;

  // Distribute rows evenly within height
  const rowSpacing = bounds.height / (numRows + 1);

  rows.forEach((row, rowIndex) => {
    const numItems = row.length;
    if (numItems === 0) return;

    // Y position for this row
    const y = bounds.top + rowSpacing * (rowIndex + 1);

    // Distribute items evenly within width
    const itemSpacing = bounds.width / (numItems + 1);

    row.forEach((_, colIndex) => {
      const x = bounds.left + itemSpacing * (colIndex + 1);
      positions.push({ x, y });
    });
  });

  return positions;
}
