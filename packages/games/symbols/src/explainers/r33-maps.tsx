/**
 * Rank 33, maps: f : A → B, ↦, ∘ and f⁻¹. The signs on the paper are
 * those of earlier ranks, the colon, the barred arrow and the ring. A
 * function's rule (rank 15) does not say where it starts or where it
 * lands; f : A → B does, with rank 24's arrow going from set to set. The
 * barred arrow goes from one element to where it lands (x ↦ 2x). The ring
 * joins two functions done one after the other (g ∘ f, f first), and a
 * raised −1 names the function that undoes f (it does not mean one over
 * f). Where they are used: saying exactly which numbers a function works
 * on, and doing a job in steps (hours to minutes to seconds).
 *
 * No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Patch, Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { arrow, loop, member, type Loop, type Pen } from '../kit/logic'
import { line, type Sprite } from '../kit/sprites'
import { TOP } from './shared'

// ── sets as columns, and arrows between them ─────────────────────────────

const RX = 150
const RY = 280
const MID = 600
const DOWN = 180
/** Where the i-th element of the set at x stands (`dy` lower, when a line is written over the sets). */
const at = (x: number, i: number, dy = 0): Pt => ({ x, y: MID + dy + (i - 1) * DOWN })
/** A set drawn as a tall loop, its three elements one under another and its name over it. */
const column = (k: string, x: number, name: string, of: string[], o: { pen?: Pen; gold?: number[]; dy?: number } = {}): Sprite[] => {
  const l: Loop = { x, y: MID + (o.dy ?? 0), rx: RX, ry: RY }
  return [...loop(k, l, { name, nameAt: { x, y: l.y - RY - 66 }, pen: o.pen }), ...of.map((g, i) => member(`${k}${i}`, g, at(x, i, o.dy), { size: 92, gold: o.gold?.includes(i) }))]
}
/** The function's name over its arrows. */
const named = (k: string, x: number, toks: Tok[], dy = 0) => line(toks, { x, y: MID + dy - DOWN - 78, size: 84 }).map((s) => ({ ...s, k: `${k}/${s.k}` }))

/** Two sets: A (one, two, three) and B (two, four, six); f doubles. `back` turns the arrows round. */
const XA = 300
const XB = 800
const two = (o: { arrows?: number[]; gold?: number; back?: boolean; name?: boolean; goldA?: number[]; goldB?: number[] } = {}): Patch => ({
  a: column('a', XA, 'A', ['1', '2', '3'], { pen: 'blue', gold: o.goldA }),
  b: column('b', XB, 'B', ['2', '4', '6'], { pen: 'red', gold: o.goldB }),
  go: (o.arrows ?? [0, 1, 2]).map((i) => (o.back ? arrow(`back${i}`, at(XB, i), at(XA, i), { gap: 72, pen: o.gold === i ? 'gold' : 'ink' }) : arrow(`go${i}`, at(XA, i), at(XB, i), { gap: 72, pen: o.gold === i ? 'gold' : 'ink' }))),
  f: o.name === false ? [] : named('f', (XA + XB) / 2, o.back ? [{ fn: 'f' }, { sup: '−1' }] : [{ fn: 'f' }]),
})

/** Three sets in a row: f doubles from A to B, g adds one from B to C. `through` draws the long way round from one straight to three. */
const X3 = [330, 960, 1590]
const LOW = 80
const three = (through = false): Patch => ({
  a: column('a', X3[0], 'A', ['1', '2', '3'], { pen: 'blue', gold: through ? [0] : [], dy: LOW }),
  b: column('b', X3[1], 'B', ['2', '4', '6'], { pen: 'red', dy: LOW }),
  c: column('c', X3[2], 'C', ['3', '5', '7'], { pen: 'green', gold: through ? [0] : [], dy: LOW }),
  go: [0, 1, 2].flatMap((i) => [arrow(`go${i}`, at(X3[0], i, LOW), at(X3[1], i, LOW), { gap: 72, pen: through && i === 0 ? 'gold' : 'ink' }), arrow(`on${i}`, at(X3[1], i, LOW), at(X3[2], i, LOW), { gap: 72, pen: through && i === 0 ? 'gold' : 'ink' })]),
  f: named('f', (X3[0] + X3[1]) / 2, [{ fn: 'f' }], LOW),
  g: named('g', (X3[1] + X3[2]) / 2, [{ fn: 'g' }], LOW),
})

/** The lines written beside the two sets. */
const SIDE = { x: 1440, y: [300, 520, 740] }
const beside = (i: number, toks: Tok[], o: { size?: number; gold?: string[] } = {}) => line(toks, { x: SIDE.x, y: SIDE.y[i], size: o.size ?? 150, gold: o.gold })

const of = (f: string, x: Tok): Tok[] => [{ fn: f }, '(', x, ')']
const FAB: Tok[] = [{ fn: 'f' }, ':', 'A', '→', 'B']
const INV: Tok[] = [{ fn: 'f' }, { sup: '−1' }]

export const r33: Spec = {
  rank: 33,
  id: 'r33',
  title: 'Maps',
  // The sets lie under the arrows that run into them.
  layers: ['a', 'b', 'c'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { ...two({ arrows: [0, 1], goldA: [2] }), rule: beside(0, [...of('f', 'x'), '=', '2', 'x'], { size: 130 }) },
      say: 'F doubles each number in the set A, and lands in the set B. Where does it take three?',
      turn: { kind: 'predict', id: 'takes3', prompt: 'Where does f take three?', options: [{ label: 'Four' }, { label: 'Six' }] },
    },
    { stage: { ...two({ gold: 2, goldA: [2], goldB: [2] }) }, say: 'To six. Every element of A has its arrow.' },
    { stage: { ...two(), rule: beside(0, [...of('f', 'x'), '=', '2', 'x'], { size: 130, gold: ['='] }) }, move: 0.5, say: 'The rule, f of x equals two x, does not say where f starts, or where it lands.' },

    // ── 2. What the signs do ──
    {
      act: 2,
      stage: { rule: null, line: beside(0, FAB, { gold: [':', '→'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'So we write it with a colon and an arrow. We read it: F, from A to B.',
    },
    { stage: { line: beside(0, FAB) }, move: 0.5, say: 'The arrow points from the set where f starts to the set where it lands.' },
    {
      stage: { each: beside(1, ['x', '↦', '2', 'x'], { gold: ['↦'] }) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'A second arrow, with a bar at its tail, is for one element. We read it: x maps to two x.',
      poster: true,
    },
    {
      stage: { ...two({ gold: 2, goldA: [2], goldB: [2] }), each: beside(1, ['x', '↦', '2', 'x']), one: beside(2, ['3', '↦', '6']) },
      say: 'The plain arrow joins sets. The barred arrow joins elements: three maps to six.',
    },
    {
      clear: true,
      stage: { ...three(), line: line([{ fn: 'g' }, '∘', { fn: 'f' }], { y: 135, size: 150, gold: ['∘'] }) },
      quiet: 0.7,
      motif: true,
      say: 'A second function, g, adds one. Do f, then g: a small ring joins them. We read it: G after F.',
    },
    {
      stage: { ...three(true), line: line(['(', { fn: 'g' }, '∘', { fn: 'f' }, ')', '(', '1', ')', '=', '3'], { y: 135, size: 130 }) },
      say: 'It is read from the right: f is done first. One goes to two, then to three.',
    },
    {
      clear: true,
      stage: { ...two({ back: true }), line: beside(0, [...INV, ':', 'B', '→', 'A'], { size: 140, gold: ['pow'] }) },
      quiet: 0.7,
      say: 'Turn every arrow round, and we have the function that undoes f. We write f with a small minus one raised, and read it: F inverse.',
    },
    {
      stage: { ...two({ back: true, gold: 2, goldA: [2], goldB: [2] }), line: beside(0, [...INV, ':', 'B', '→', 'A'], { size: 140 }), each: beside(1, [...INV, '(', '6', ')', '=', '3'], { size: 140 }) },
      say: 'F inverse of six is three. The minus one here is not a power. It means: undo f.',
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: { line: line([{ fn: 'f' }, ':', 'ℝ', '→', 'ℝ'], { y: 330, size: 170 }), each: line(['x', '↦', 'x', { sup: '2' }], { y: 620, size: 170 }) },
      say: 'These signs say what a function works on. Squaring takes each real number to a real number.',
    },
    {
      clear: true,
      stage: { f: line(['h', '↦', '60', 'h'], { x: 520, y: 330, size: 150 }), g: line(['m', '↦', '60', 'm'], { x: 1400, y: 330, size: 150 }) },
      say: 'Joining maps does a job in steps. One turns hours into minutes, the next turns minutes into seconds.',
    },
    { stage: { both: line(['h', '↦', '3,600', 'h'], { y: 700, size: 190, gold: ['↦'] }) }, say: 'One after the other, they turn hours straight into seconds.' },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { given: line(['x', '↦', 'x', '+', '2'], { y: TOP, size: 140 }) },
      say: 'This map takes x to x plus two. Which is true?',
      turn: { kind: 'choose', id: 'maps5', prompt: 'Which one is true?', cards: [['3', '↦', '5'], ['3', '↦', '6']], right: 0 },
    },
    {
      clear: true,
      say: 'Which arrow goes from an element to where it lands? Put it in.',
      turn: { kind: 'place', id: 'whicharrow', prompt: 'Which arrow goes from an element to where it lands?', toks: ['x', '_', 'x', '+', '1'], tiles: ['→', '↦'], right: '↦', size: 190 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(FAB, { y: 480, size: 230 }) }, move: 0.6, say: 'F, from A to B.', turn: { kind: 'read', id: 'readfab', prompt: 'You read it.' } },
    { clear: true, teaser: true, stage: { line: line([...of('f', 'x'), '=', '2', 'x'], { y: 560, size: 230 }) }, say: 'F of x equals two x. Did we find that out, or did we decide it?' },
    {
      teaser: true,
      stage: { line: line([...of('f', 'x'), '=', '2', 'x'], { y: 560, size: 230, gold: ['='] }), ask: line(['?'], { x: 1010, y: 300, size: 200, gold: ['?'] }) },
      move: 0.5,
      say: 'The equals sign cannot say.',
      pad: 1,
    },
  ],
}
