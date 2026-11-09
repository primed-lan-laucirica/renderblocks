/**
 * Rank 3, × and · : the same pile again and again, as rows of an array. The
 * signs on the paper are =, +, × and · only. Times is the short way to write
 * plus again and again, and it works either way round.
 *
 * Why there is a dot is told as a reason, not as history: the cross is easily
 * confused with the letter x. (Checked: Oughtred used the cross in 1631;
 * Leibniz, in a letter of 1698, gave that reason for using a dot.)
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Spec } from '../engine/spec'
import { balance, beadsOn, cardOn, grid, line, loose, props, words, type Pile } from '../kit/sprites'
import { beam, FROM_TRAY, OVER_LEFT, PAN_ZONE, plate, TOP } from './shared'

const THREES: Pile[] = Array.from({ length: 5 }, () => ({ n: 3, cols: 1, colour: 'blue' }))
const FIVES: Pile[] = Array.from({ length: 3 }, () => ({ n: 5, cols: 1 }))
const PILES = ['3', '+', '3', '+', '3', '+', '3', '+', '3', '=', '15']

const STEP = 76
const MID = { x: 960, y: 640 }
/** The array: `rows` rows of three; turned, the same beads stand as three rows of five. */
const array = (rows: number, turned = false) => {
  const pts: Pt[] = grid(15, 3, MID.x, MID.y, STEP)
  const at = turned ? pts.map((_, i) => ({ x: MID.x + (Math.floor(i / 3) - 2) * STEP, y: MID.y + ((i % 3) - 1) * STEP })) : pts
  return loose(at, { s: 1.6, k: 'a', colour: 'blue' })
    .slice(0, rows * 3)
    .map((s) => ({ ...s, enter: { x: s.n.x - 520, y: s.n.y } }))
}

const FIVE = { g: '5', k: 'five' }
const THREE = { g: '3', k: 'three' }

const PLATES = [560, 960, 1360].map((x, i) => plate(`p${i}`, x, 800))

export const r03: Spec = {
  rank: 3,
  id: 'r03',
  title: 'Times',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { props: props(), scale: balance({ left: { ...beadsOn(...THREES), size: 26 }, right: { ...beadsOn(...FIVES), size: 26 }, held: true }) },
      say: 'Five piles of three. Three piles of five. Are they the same amount?',
      turn: { kind: 'predict', id: 'piles', prompt: 'Are they the same amount?', options: [{ label: 'The same', icon: beam(0) }, { label: 'Not the same', icon: beam(-14) }] },
    },
    { stage: { props: null }, cue: 'slide', say: 'The same! Fifteen here, and fifteen there.' },
    { stage: { line: line(PILES, { y: TOP, size: 100 }) }, say: 'To write five piles of three, we need plus again and again.' },
    { stage: { line: line(PILES, { y: TOP, size: 100, gold: ['+'] }) }, move: 0.5, say: 'That is a lot of writing. We need something shorter.' },

    // ── 2. What the sign does ──
    { act: 2, clear: true, stage: { array: array(1) }, say: 'Here is a row of three.' },
    {
      stage: { array: array(2) },
      move: 0.5,
      cue: 'bead',
      also: [3, 4, 5].map((rows, i) => ({ at: 0.7 * (i + 1), move: 0.5, cue: 'bead' as const, stage: { array: array(rows) } })),
      say: 'And again, and again. Three, five times.',
    },
    { stage: { line: line(['×'], { y: TOP, size: 220 }) }, quiet: 1.6, motif: true, say: 'This is the times sign.' },
    { stage: { line: line([FIVE, '×', THREE, '=', '15'], { y: TOP }) }, say: 'Five times three equals fifteen.', poster: true },
    { stage: { long: line(PILES, { y: 372, size: 76 }) }, say: 'One sign, instead of plus again and again.' },

    // ── 3. Where it is used ──
    { act: 3, stage: { long: null, array: array(5, true), line: line([THREE, '×', FIVE, '=', '15'], { y: TOP }) }, move: 1.4, cue: 'slide', say: 'Turn it round: three times five. Still fifteen.' },
    { stage: { line: line(['5', '+', '5', '+', '5', '=', '3', '×', '5'], { y: TOP, size: 130 }) }, say: 'Five plus five plus five is three times five.' },
    { stage: { line: line([THREE, '·', FIVE, '=', '15'], { y: TOP }) }, quiet: 1.5, motif: true, say: 'This dot also means times.' },
    { clear: true, stage: { sign: line(['×'], { x: 740, y: 450, size: 320 }), letter: words('x', { x: 1180, y: 425, size: 340, font: 'old' }) }, say: 'The cross looks a lot like the letter x.' },
    { stage: { letter: null, sign: line(['·'], { x: 960, y: 450, size: 320 }) }, say: 'So in later maths, you will often see the dot instead.' },
    { clear: true, stage: { line: line(['1,000', '×', '1,000', '=', '1,000,000'], { y: 480, size: 125 }) }, quiet: 1.5, say: 'A thousand times a thousand equals a million.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      say: 'How many threes make twelve? Put on threes.',
      turn: {
        kind: 'build',
        id: 'threes',
        prompt: 'How many threes make twelve?',
        target: 4,
        max: 6,
        unit: 3,
        zone: PAN_ZONE.left,
        state: (n) => ({
          scale: balance({ left: { ...beadsOn(...Array.from({ length: n }, (): Pile => ({ n: 3, cols: 1 }))), from: FROM_TRAY.left, size: 40 }, right: cardOn('12') }),
          line: line([{ g: n === 0 ? '?' : String(n), k: 'made' }, '×', '3', '=', '12'], { y: TOP, at: OVER_LEFT, gold: n === 4 ? ['='] : [], faint: n === 4 ? [] : ['='] }),
        }),
      },
    },
    {
      clear: true,
      stage: { rows: loose(grid(12, 3, 960, 200, 54), { s: 1.15, k: 'c', colour: 'blue' }) },
      say: 'Four rows of three. Which one is true?',
      turn: { kind: 'choose', id: 'true12', prompt: 'Which one is true?', cards: [['4', '×', '3', '=', '12'], ['4', '+', '3', '=', '12']], right: 0 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['6', '·', '2', '=', '12'], { y: 480, size: 190 }) }, move: 0.6, say: 'Six times two equals twelve.', turn: { kind: 'read', id: 'read6', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { plates: PLATES, heap: loose(grid(12, 6, 960, 520, 70), { s: 1.5, k: 'h' }), line: line(['12', '_', '3'], { y: 260 }) },
      say: 'Twelve beads, to share between three plates.',
    },
    { teaser: true, stage: { line: line(['12', '_', '3'], { y: 260, gold: ['_'] }) }, move: 0.5, say: 'How do we write "shared"?', pad: 1 },
  ],
}
