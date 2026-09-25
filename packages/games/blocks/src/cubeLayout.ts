// Cube arrangement and colouring for a number block, independent of how it
// is drawn — shared by the Blocks game and LavaBlocks (which draws on canvas).
import { getNumberBlockColor, type Position } from './types';

// Helper: get positions for a sub-block (used for tens/units remainder)
function getSubBlockPositions(count: number, offsetX: number, offsetY: number, cubeSize: number, cubeGap: number): Position[] {
  const positions: Position[] = [];
  if (count === 0) return positions;

  // Special arrangements for certain numbers
  if (count === 4) {
    // 2x2 square
    for (let i = 0; i < 4; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      positions.push({
        x: offsetX + col * (cubeSize + cubeGap),
        y: offsetY + (1 - row) * (cubeSize + cubeGap),
      });
    }
  } else if (count === 7) {
    // Vertical rainbow tower
    for (let i = 0; i < count; i++) {
      positions.push({
        x: offsetX,
        y: offsetY + (count - 1 - i) * (cubeSize + cubeGap),
      });
    }
  } else if (count === 9) {
    // 3x3 square
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      positions.push({
        x: offsetX + col * (cubeSize + cubeGap),
        y: offsetY + (2 - row) * (cubeSize + cubeGap),
      });
    }
  } else if (count <= 5) {
    // Vertical stack
    for (let i = 0; i < count; i++) {
      positions.push({
        x: offsetX,
        y: offsetY + (count - 1 - i) * (cubeSize + cubeGap),
      });
    }
  } else {
    // 2 columns for 6+
    let cols = 2;
    if (count >= 30) cols = Math.floor(count / 10);
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions.push({
        x: offsetX + col * (cubeSize + cubeGap),
        y: offsetY + (rows - 1 - row) * (cubeSize + cubeGap),
      });
    }
  }
  return positions;
}

// Generate cube positions for a given value
export function getCubePositions(value: number, cubeSize: number, cubeGap: number): Position[] {
  // For values < 100, use simple layouts
  if (value < 100) {
    return getSubBlockPositions(value, 0, 0, cubeSize, cubeGap);
  }

  // For values 100-999: arrange hundreds as 10×10 squares
  const positions: Position[] = [];
  const hundreds = Math.floor(value / 100);
  const tensAndUnits = value % 100;

  // Size of a 10×10 hundred-square (including internal gaps)
  const hundredSquareSize = 10 * cubeSize + 9 * cubeGap;
  const hundredSquareSpacing = hundredSquareSize + cubeGap * 2; // gap between squares

  // Arrange hundred-squares: stack vertically for 1-3, then use columns
  let hundredCols = 1;
  if (hundreds >= 4) hundredCols = 2;
  if (hundreds >= 7) hundredCols = 3;
  const hundredRows = Math.ceil(hundreds / hundredCols);

  // Generate positions for cubes in hundred-squares
  for (let i = 0; i < hundreds * 100; i++) {
    const whichHundred = Math.floor(i / 100);
    const posInHundred = i % 100;

    const hRow = Math.floor(whichHundred / hundredCols);
    const hCol = whichHundred % hundredCols;

    const cubeRow = Math.floor(posInHundred / 10);
    const cubeCol = posInHundred % 10;

    positions.push({
      x: hCol * hundredSquareSpacing + cubeCol * (cubeSize + cubeGap),
      y: (hundredRows - 1 - hRow) * hundredSquareSpacing + (9 - cubeRow) * (cubeSize + cubeGap),
    });
  }

  // Add remainder (tens + units) to the right of the hundreds
  if (tensAndUnits > 0) {
    const remainderOffsetX = hundredCols * hundredSquareSpacing + cubeGap * 2;
    // Align remainder to bottom of the hundreds area
    const remainderPositions = getSubBlockPositions(tensAndUnits, remainderOffsetX, 0, cubeSize, cubeGap);
    positions.push(...remainderPositions);
  }

  return positions;
}

// Gray gradient colors for 9 (lightest at bottom, darkest at top)
export const NINE_GRAY_COLORS = [
  '#D0D0D0', // bottom row - lightest
  '#D0D0D0',
  '#D0D0D0',
  '#A0A0A0', // middle row
  '#A0A0A0',
  '#A0A0A0',
  '#606060', // top row - darkest
  '#606060',
  '#606060',
];

// Pale versions of each Numberblock color (for tens portions)
export const PALE_COLORS: Record<number, string> = {
  1: '#FFFFFF',  // White (special case for 10s)
  2: '#FFD4A8',  // Pale orange
  3: '#FFF4B8',  // Pale yellow
  4: '#B8F0B8',  // Pale green
  5: '#B8E8FF',  // Pale cyan
  6: '#C4A8D0',  // Pale indigo
  7: '#D8B8FF',  // Pale violet
  8: '#FFB8FF',  // Pale magenta
  9: '#C8C8C8',  // Pale gray
};

// Helper: get color for a digit, handling special cases (7=rainbow, 9=gray gradient)
export function getDigitColor(digit: number, indexWithinDigit: number, isPale: boolean): string {
  if (digit === 7) {
    // Rainbow: each position gets a different color
    const color = indexWithinDigit + 1;
    return isPale ? (PALE_COLORS[color] || '#FFFFFF') : getNumberBlockColor(color);
  }
  if (digit === 9 && !isPale) {
    // Gray gradient only for primary (not pale)
    return NINE_GRAY_COLORS[indexWithinDigit] || '#808080';
  }
  return isPale ? (PALE_COLORS[digit] || '#FFFFFF') : getNumberBlockColor(digit);
}

// Get the color for a specific cube within a block
// Order of magnitude alternation: units=primary, tens=pale, hundreds=primary, thousands=pale, etc.
export function getCubeColor(blockValue: number, cubeIndex: number, _totalCubes: number): string {
  // Base cases (1-10)
  if (blockValue <= 10) {
    if (blockValue === 7) {
      return getNumberBlockColor(cubeIndex + 1);
    }
    if (blockValue === 9) {
      return NINE_GRAY_COLORS[cubeIndex] || '#808080';
    }
    return getNumberBlockColor(blockValue);
  }

  // For values 11-99: tens=pale, units=primary
  if (blockValue < 100) {
    const tensDigit = Math.floor(blockValue / 10);
    const tensCount = tensDigit * 10;
    const units = blockValue % 10;

    if (cubeIndex < tensCount) {
      // TENS PORTION: pale
      if (tensDigit === 7) {
        const column = Math.floor(cubeIndex / 10);
        return PALE_COLORS[column + 1] || '#FFFFFF';
      }
      return PALE_COLORS[tensDigit] || '#FFFFFF';
    } else {
      // UNITS PORTION: primary
      const unitsIndex = cubeIndex - tensCount;
      return getDigitColor(units, unitsIndex, false);
    }
  }

  // For values 100-999: hundreds=primary, tens=pale, units=primary
  if (blockValue < 1000) {
    const hundredsDigit = Math.floor(blockValue / 100);
    const hundredsCount = hundredsDigit * 100;
    const tensDigit = Math.floor((blockValue % 100) / 10);
    const tensCount = tensDigit * 10;
    const units = blockValue % 10;

    if (cubeIndex < hundredsCount) {
      // HUNDREDS PORTION: primary
      if (hundredsDigit === 7) {
        // Rainbow hundreds: each column of 100 gets a different color
        const column = Math.floor(cubeIndex / 100);
        return getNumberBlockColor(column + 1);
      }
      return getNumberBlockColor(hundredsDigit);
    } else if (cubeIndex < hundredsCount + tensCount) {
      // TENS PORTION: pale
      const tensIndex = cubeIndex - hundredsCount;
      if (tensDigit === 7) {
        const column = Math.floor(tensIndex / 10);
        return PALE_COLORS[column + 1] || '#FFFFFF';
      }
      return PALE_COLORS[tensDigit] || '#FFFFFF';
    } else {
      // UNITS PORTION: primary
      const unitsIndex = cubeIndex - hundredsCount - tensCount;
      return getDigitColor(units, unitsIndex, false);
    }
  }

  // For values 1000+: thousands=pale, hundreds=primary, tens=pale, units=primary
  const thousandsDigit = Math.floor(blockValue / 1000);
  const thousandsCount = thousandsDigit * 1000;
  const hundredsDigit = Math.floor((blockValue % 1000) / 100);
  const hundredsCount = hundredsDigit * 100;
  const tensDigit = Math.floor((blockValue % 100) / 10);
  const tensCount = tensDigit * 10;
  const units = blockValue % 10;

  if (cubeIndex < thousandsCount) {
    // THOUSANDS PORTION: pale
    if (thousandsDigit === 7) {
      const column = Math.floor(cubeIndex / 1000);
      return PALE_COLORS[column + 1] || '#FFFFFF';
    }
    return PALE_COLORS[thousandsDigit] || '#FFFFFF';
  } else if (cubeIndex < thousandsCount + hundredsCount) {
    // HUNDREDS PORTION: primary
    if (hundredsDigit === 7) {
      const column = Math.floor((cubeIndex - thousandsCount) / 100);
      return getNumberBlockColor(column + 1);
    }
    return getNumberBlockColor(hundredsDigit);
  } else if (cubeIndex < thousandsCount + hundredsCount + tensCount) {
    // TENS PORTION: pale
    const tensIndex = cubeIndex - thousandsCount - hundredsCount;
    if (tensDigit === 7) {
      const column = Math.floor(tensIndex / 10);
      return PALE_COLORS[column + 1] || '#FFFFFF';
    }
    return PALE_COLORS[tensDigit] || '#FFFFFF';
  } else {
    // UNITS PORTION: primary
    const unitsIndex = cubeIndex - thousandsCount - hundredsCount - tensCount;
    return getDigitColor(units, unitsIndex, false);
  }
}

// Get the outline color for a specific cube (null = no outline)
// Outlines match the digit color (primary version) for tens and hundreds portions
export function getCubeOutlineColor(blockValue: number, cubeIndex: number): string | null {
  if (blockValue < 10) {
    return null; // No outline for 1-9
  }

  // For 10-99: tens portion gets outline
  if (blockValue < 100) {
    const tensDigit = Math.floor(blockValue / 10);
    const tensCount = tensDigit * 10;

    if (cubeIndex < tensCount || blockValue === tensCount) {
      if (tensDigit === 7) {
        const column = Math.floor(cubeIndex / 10);
        return getNumberBlockColor(column + 1);
      }
      return getNumberBlockColor(tensDigit);
    }
    return null;
  }

  // For 100-999: hundreds and tens portions get outlines
  if (blockValue < 1000) {
    const hundredsDigit = Math.floor(blockValue / 100);
    const hundredsCount = hundredsDigit * 100;
    const tensDigit = Math.floor((blockValue % 100) / 10);
    const tensCount = tensDigit * 10;

    if (cubeIndex < hundredsCount) {
      // HUNDREDS PORTION: outline of hundreds digit color
      if (hundredsDigit === 7) {
        const column = Math.floor(cubeIndex / 100);
        return getNumberBlockColor(column + 1);
      }
      return getNumberBlockColor(hundredsDigit);
    } else if (cubeIndex < hundredsCount + tensCount) {
      // TENS PORTION: outline of tens digit color
      if (tensDigit === 7) {
        const column = Math.floor((cubeIndex - hundredsCount) / 10);
        return getNumberBlockColor(column + 1);
      }
      return getNumberBlockColor(tensDigit);
    }
    return null; // Units have no outline
  }

  // For 1000+: thousands, hundreds, and tens portions get outlines
  const thousandsDigit = Math.floor(blockValue / 1000);
  const thousandsCount = thousandsDigit * 1000;
  const hundredsDigit = Math.floor((blockValue % 1000) / 100);
  const hundredsCount = hundredsDigit * 100;
  const tensDigit = Math.floor((blockValue % 100) / 10);
  const tensCount = tensDigit * 10;

  if (cubeIndex < thousandsCount) {
    // THOUSANDS PORTION: outline
    if (thousandsDigit === 7) {
      const column = Math.floor(cubeIndex / 1000);
      return getNumberBlockColor(column + 1);
    }
    return getNumberBlockColor(thousandsDigit);
  } else if (cubeIndex < thousandsCount + hundredsCount) {
    // HUNDREDS PORTION: outline
    if (hundredsDigit === 7) {
      const column = Math.floor((cubeIndex - thousandsCount) / 100);
      return getNumberBlockColor(column + 1);
    }
    return getNumberBlockColor(hundredsDigit);
  } else if (cubeIndex < thousandsCount + hundredsCount + tensCount) {
    // TENS PORTION: outline
    const tensIndex = cubeIndex - thousandsCount - hundredsCount;
    if (tensDigit === 7) {
      const column = Math.floor(tensIndex / 10);
      return getNumberBlockColor(column + 1);
    }
    return getNumberBlockColor(tensDigit);
  }

  return null; // Units have no outline
}

export { getNumberBlockColor };
