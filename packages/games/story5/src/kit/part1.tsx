/* eslint-disable react-refresh/only-export-components -- the kit exports its drawings together with the sizes they share */
/**
 * Part 1's drawings (Quantity): the shepherd's sheep, the hero pebble, dot
 * patterns for seeing a number at a glance, and rods drawn at the scale the
 * Part 1 episodes use. Pure functions of their props, like the rest of the kit.
 */
import { NumberRod, Pebble } from './kit'
import { INK, PEBBLE_COLOURS, ROD_UNIT, SANS } from './sizes'

/** The scale Part 1 draws rods and the track at (a rod of 10 is 960 px). */
export const ROD_S = 1.6
export const UNIT = ROD_UNIT * ROD_S
export const ROD_H = 30 * ROD_S

/**
 * The pebble that stood for a sheep (Episode 1's first, and the one Episode
 * 26 closes on): always this colour, this shape, this size.
 */
export const HERO = { colour: PEBBLE_COLOURS[0], seed: 1, r: 22 } as const

/** Pebble i of a pile: the hero's colour, each its own seeded shape (pebble 0 is the hero). */
export function PilePebble({ x, y, i, o = 1 }: { x: number; y: number; i: number; o?: number }) {
  return <Pebble x={x} y={y} r={HERO.r} colour={HERO.colour} seed={HERO.seed + i} o={o} />
}

/** A sheep, standing, centred on (x, y), about 110 px wide. `step` moves its legs. */
export function Sheep({ x, y, s = 1, o = 1, step = 0, flip = false }: { x: number; y: number; s?: number; o?: number; step?: number; flip?: boolean }) {
  const swing = Math.sin(step) * 5
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} opacity={o}>
      <ellipse cx={0} cy={44} rx={50} ry={7} fill="rgba(60,40,20,0.15)" />
      {[-26, -10, 12, 28].map((lx, i) => (
        <line key={lx} x1={lx} y1={14} x2={lx + (i % 2 ? swing : -swing)} y2={42} stroke="#3b2f25" strokeWidth={6} strokeLinecap="round" />
      ))}
      {[
        [-30, 0, 20],
        [-12, -12, 22],
        [10, -12, 22],
        [28, -2, 20],
        [-14, 8, 20],
        [12, 8, 20],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#f7f3ea" stroke="#d8cdb8" strokeWidth={2} />
      ))}
      <ellipse cx={50} cy={-10} rx={14} ry={18} fill="#3b2f25" transform="rotate(-20 50 -10)" />
      <ellipse cx={42} cy={-24} rx={8} ry={4} fill="#3b2f25" transform="rotate(-35 42 -24)" />
      <circle cx={54} cy={-14} r={2.5} fill="#f7f3ea" />
    </g>
  )
}

/** Where the dots of a pattern for n (1–6) sit, in a unit square (dice layout). */
export function patternDots(n: number): [number, number][] {
  const L = 0.24
  const M = 0.5
  const R = 0.76
  switch (n) {
    case 1:
      return [[M, M]]
    case 2:
      return [
        [L, L],
        [R, R],
      ]
    case 3:
      return [
        [L, L],
        [M, M],
        [R, R],
      ]
    case 4:
      return [
        [L, L],
        [R, L],
        [L, R],
        [R, R],
      ]
    case 5:
      return [
        [L, L],
        [R, L],
        [M, M],
        [L, R],
        [R, R],
      ]
    default:
      return [
        [L, L],
        [R, L],
        [L, M],
        [R, M],
        [L, R],
        [R, R],
      ]
  }
}

/** A dot pattern card for n: a cream square with n dots (top-left at x, y). */
export function DotPattern({ n, x, y, size = 220, o = 1 }: { n: number; x: number; y: number; size?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={o}>
      <rect x={4} y={6} width={size} height={size} rx={size * 0.1} fill="rgba(60,40,20,0.15)" />
      <rect x={0} y={0} width={size} height={size} rx={size * 0.1} fill="#fbf6ea" stroke="#d8c8a6" strokeWidth={3} />
      {patternDots(n).map(([dx, dy], i) => (
        <circle key={i} cx={dx * size} cy={dy * size} r={size * 0.09} fill={HERO.colour} />
      ))}
    </g>
  )
}

/** A Part 1 rod (left end at x, y), at Part 1's scale. */
export function Rod({ n, x, y, o = 1 }: { n: number; x: number; y: number; o?: number }) {
  return <NumberRod n={n} x={x} y={y} s={ROD_S} o={o} />
}

/** A numeral label, plain and dark (Part 1's numbers arrive after the objects). */
export function Label({ text, x, y, o = 1, size = 56, anchor = 'start' }: { text: string; x: number; y: number; o?: number; size?: number; anchor?: 'start' | 'middle' | 'end' }) {
  if (o <= 0) return null
  return (
    <text x={x} y={y} fontFamily={SANS} fontWeight={800} fontSize={size} fill={INK} textAnchor={anchor} dominantBaseline="middle" opacity={o}>
      {text}
    </text>
  )
}
