/** The kit's fixed sizes and colours (the same in every episode and workshop). */
export const BEAD = 22
export const GAP = 2
/** A ten bar's length (and a hundred square's side). */
export const BAR = BEAD * 10 + GAP * 9
export const GOLD = '#e0a82e'
export const GOLD_EDGE = '#a7771a'
export const WIRE = '#8a6a2a'
export const PAPER = '#efe6d4'
export const INK = '#3b2f25'
export const SOFT = '#7a6a58'
export const SANS = "Inter, Nunito, system-ui, 'DejaVu Sans', sans-serif"
export const SERIF = "Georgia, 'GFS Baskerville', 'DejaVu Serif', serif"
/** Montessori place-value colours: units green, tens blue, hundreds red, thousands green again. */
export const PLACE_COLOUR = ['#2f855a', '#2b6cb0', '#c53030', '#2f855a']
/** The tile colours of the stamp game, by place. */
export const TILE_COLOUR = PLACE_COLOUR
export const PEBBLE_COLOURS = ['#c8643b', '#d9a441', '#7f9a6a', '#6f97b3', '#8a5a7a']
/** Numeral cards: width per digit and height. */
export const DIGIT_W = 64
export const CARD_H = 100
/** A stamp-game tile's side. */
export const TILE = 64
/** One unit of a number rod (and of the number track). */
export const ROD_UNIT = 60
/** Montessori bead-bar colours, 1–9 (index n − 1); 10 is gold. */
export const BAR_COLOURS = ['#d63b3b', '#3fa34d', '#f08cb3', '#f2d03b', '#7cc4e8', '#9b6fc1', '#f5f5f0', '#8a5a34', '#2c4f9e', GOLD]
export const BEAD_R = 11
/** A fraction circle's radius. */
export const FRAC_R = 150
export const DECIMAL_PLACES = ['thousands', 'hundreds', 'tens', 'units', 'tenths', 'hundredths', 'thousandths']
