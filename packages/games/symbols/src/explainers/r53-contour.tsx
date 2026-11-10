/**
 * Rank 53, the closed integral: the integral sign with a ring on it, and
 * the name of a curve at its foot. The signs on the paper are those of
 * ranks 1–5, letters (rank 12), functions (rank 15), sigma (rank 19), the
 * integral and its d (ranks 37–39), a vector's arrow (rank 41), the dot
 * and the cross between vectors (rank 43), del (rank 45) and the rank's
 * own ∮. A field gives a push at every place. Walk along a path, and at
 * every small step take how much of the push lies along the step (the dot
 * of rank 43); add those up. When the path is a loop, ending where it
 * began, the ring is drawn on the integral: ∮ F · dr, with the loop's
 * name, C, at the foot. Round a square of side two, counted side by side:
 * in a steady wind 2 + 0 − 2 + 0 = 0; in a whirl 2 + 2 + 2 + 2 = 8.
 * Where it is used: the work done going round a hill and back (zero), how
 * much a flow turns, the push on electricity round a loop of wire.
 *
 * The ties between signs: the plain integral ran along a line from a to
 * b, and a loop has no ends to write, only its name; and rank 45's curl
 * is this sum round a very small loop. This is the last rank, so it ends
 * on a closing line, not on a question. It opens on the picture rank 52
 * closed on: a steady wind, and a red path that comes back to where it
 * began. No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Patch, Spec } from '../engine/spec'
import { SUPPLY } from '../engine/turns'
import type { Tok } from '../kit/glyphs'
import { PEN } from '../kit/logic'
import { INK, PAPER } from '../kit/look'
import { beadAt } from '../kit/measures'
import { line, row, type Sprite } from '../kit/sprites'
import { arrowOn, at, field, label, type Field, type Plane, type Vec } from '../kit/vectors'
import { TOP } from './shared'

const F: Tok = { vec: 'F' }
const DR: Tok = { d: [{ vec: 'r' }], k: 'dr' }
/** ∮ F · dr round the curve C, and the plain integral along a line from a to b. */
const ROUND: Tok[] = [{ big: '∮', from: 'C', k: 'round' }, F, '·', DR]
const ALONG: Tok[] = [{ big: '∫', from: 'a', to: 'b', k: 'int' }, F, '·', DR]
const SIDE = { x: 1500, size: 160 }

/** The steady wind of the question rank 52 closed on, and a whirl round the middle of the path. */
const W: Plane = { x: 330, y: 830, u: 150, w: 5, h: 3 }
const MID: Vec = [2.5, 1.5]
const WIND: Field = { id: 'steady', f: () => [1, 0] }
const WHIRL: Field = { id: 'whirl', f: (x, y) => [MID[1] - y, x - MID[0]] }
const wind = (pl = W): Sprite[] => [field('wind', pl, WIND, { scale: 0.56, w: 8 })]
const whirl = (pl = W): Sprite[] => [field('whirl', pl, WHIRL, { scale: 0.28, w: 8 })]

/** The path: a square of side two that comes back to where it began, walked from its bottom left corner, the bottom first. It lies between the field's arrows. */
const CORNERS: Vec[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
]
const corner = (j: number, pl = W): Pt => at(pl, MID[0] + CORNERS[j % 4][0], MID[1] + CORNERS[j % 4][1])
/** Drawn as rank 52 drew it: `go` is how much of the way round is drawn (it comes on drawing itself), `s` shrinks it round its middle. */
const round = (k: string, o: { go?: number; s?: number; w?: number; pl?: Plane; drawn?: boolean } = {}): Sprite => {
  const pl = o.pl ?? W
  const m = at(pl, MID[0], MID[1])
  return {
    k,
    type: 'custom',
    n: { go: o.go ?? 1, s: o.s ?? 1, w: o.w ?? 10, o: 1 },
    ...(o.drawn ? {} : { enter: { go: 0 } }),
    d: {
      id: `round ${pl.x} ${pl.y} ${pl.u}`,
      draw: (p) => {
        const h = p.s * pl.u
        const head = (j: number, x: number, y: number) => <path key={j} d="M -16 -20 L 16 0 L -16 20" transform={`translate(${m.x + x * h} ${m.y + y * h}) rotate(${-90 * j}) scale(${p.w / 10})`} opacity={Math.max(0, Math.min(1, (p.go * 4 - j - 0.5) * 4))} />
        return (
          <g fill="none" stroke={PEN.red} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round">
            <path d={`M ${m.x - h} ${m.y + h} h ${2 * h} v ${-2 * h} h ${-2 * h} Z`} strokeDasharray={8 * h} strokeDashoffset={8 * h * (1 - p.go)} />
            {[head(0, 0, 1), head(1, 1, 0), head(2, 0, -1), head(3, -1, 0)]}
            <circle cx={m.x - h} cy={m.y + h} r={p.w * 2} fill={PEN.red} stroke="none" />
          </g>
        )
      },
    },
  }
}
/** The bead that walks the path, at its j-th corner. */
const walker = (j: number, pl = W): Sprite[] => [beadAt('walker', corner(j, pl).x, corner(j, pl).y, 62, 'gold')]

/** What a side adds, written on a slip in the middle of that side. */
const slip = (k: string, pt: Pt, wide: number): Sprite => ({
  k,
  type: 'custom',
  n: { x: pt.x, y: pt.y, o: 1 },
  d: { id: `slip ${wide}`, draw: (p) => <rect x={p.x - wide / 2} y={p.y - 42} width={wide} height={84} rx={42} fill={PAPER} stroke={PEN.red} strokeWidth={4} /> },
})
const tags = (adds: Tok[][], pl = W): Sprite[] =>
  adds.flatMap((toks, j) => {
    const [a, b] = [corner(j, pl), corner(j + 1, pl)]
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    return [slip(`slip${j}`, mid, 46 + 44 * toks.length), ...label(`tag${j}`, toks, mid, { size: 66 })]
  })
const STEADY: Tok[][] = [['2'], ['0'], ['−', '2'], ['0']]
const TURNING: Tok[][] = [['2'], ['2'], ['2'], ['2']]
/** The sides added up, beside the picture. */
const STEADY_SUM: Tok[] = ['2', '+', '0', '−', '2', '+', '0']
const TURNING_SUM: Tok[] = ['2', '+', '2', '+', '2', '+', '2']
const sum = (toks: Tok[], total?: string): Sprite[] => line(total ? [...toks, '=', { g: total, k: 'total' }] : toks, { x: SIDE.x, y: 286, size: 92 })

/** A round loop with a point on it showing which way it is walked; `t` (0 to 1) is how far round a bead has gone, when there is one. */
const ring = (k: string, x: number, y: number, r: number, o: { colour?: string; w?: number; t?: number } = {}): Sprite => ({
  k,
  type: 'custom',
  n: { x, y, r, w: o.w ?? 9, t: o.t ?? 0, o: 1 },
  d: {
    id: `ring ${o.colour ?? INK} ${o.t === undefined ? '' : 'bead'}`,
    draw: (p) => {
      const turn = -Math.PI / 2 + p.t * 2 * Math.PI
      return (
        <g>
          <circle cx={p.x} cy={p.y} r={p.r} fill="none" stroke={o.colour ?? INK} strokeWidth={p.w} />
          <polygon points={`${p.x - p.w * 2.4},${p.y - p.r} ${p.x + p.w * 1.6},${p.y - p.r - p.w * 2} ${p.x + p.w * 1.6},${p.y - p.r + p.w * 2}`} fill={o.colour ?? INK} stroke={o.colour ?? INK} strokeWidth={p.w * 0.3} strokeLinejoin="round" />
          {o.t === undefined ? null : <circle cx={p.x - p.r * Math.cos(turn)} cy={p.y - p.r * Math.sin(turn)} r={26} fill="#e0a82e" stroke={PEN.gold} strokeWidth={5} />}
        </g>
      )
    },
  },
})

/** A line with two ends, a and b. */
const ended = (k: string, x: number, y: number, half: number): Sprite[] => [
  {
    k,
    type: 'custom',
    n: { x, y, o: 1 },
    d: {
      id: `ended ${half}`,
      draw: (p) => (
        <g>
          <line x1={p.x - half} y1={p.y} x2={p.x + half} y2={p.y} stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <circle cx={p.x - half} cy={p.y} r={16} fill={INK} />
          <circle cx={p.x + half} cy={p.y} r={16} fill={INK} />
        </g>
      ),
    },
  },
  ...label(`${k}/a`, ['a'], { x: x - half, y: y + 76 }, { size: 84 }),
  ...label(`${k}/b`, ['b'], { x: x + half, y: y + 76 }, { size: 84 }),
]

/** A hill seen from above: rings of equal height round its top. */
const HILL = { x: 470, y: 560 }
const heights = (k: string): Sprite => ({
  k,
  type: 'custom',
  n: { o: 1 },
  d: {
    id: 'heights',
    draw: () => (
      <g fill="none" stroke={INK} strokeWidth={5} opacity={0.3}>
        {[70, 160, 250, 340].map((r) => (
          <circle key={r} cx={HILL.x} cy={HILL.y} r={r} />
        ))}
        <circle cx={HILL.x} cy={HILL.y} r={9} fill={INK} />
      </g>
    ),
  },
})

/** A paddle wheel that the flow turns: `a` is how far it has turned, in degrees. */
const wheel = (k: string, pt: Pt, a: number): Sprite => ({
  k,
  type: 'custom',
  n: { x: pt.x, y: pt.y, a, o: 1 },
  d: {
    id: 'wheel',
    draw: (p) => (
      <g transform={`translate(${p.x} ${p.y}) rotate(${-p.a})`} stroke={PEN.red} strokeLinecap="round">
        {[0, 90, 180, 270].map((turn) => (
          <g key={turn} transform={`rotate(${turn})`}>
            <line x1={0} y1={0} x2={52} y2={0} strokeWidth={8} />
            <line x1={52} y1={-16} x2={52} y2={16} strokeWidth={10} />
          </g>
        ))}
        <circle r={11} fill={PEN.red} stroke="none" />
      </g>
    ),
  },
})

/** A loop of wire seen from the side, and a magnet moving up to it; `flow` brings on the points that show the push round the wire. */
const WIRE = { x: 430, y: 560, rx: 90, ry: 230 }
const COPPER = '#b0703a'
const wire = (k: string, flow: number): Sprite => ({
  k,
  type: 'custom',
  n: { flow, o: 1 },
  d: {
    id: 'wire',
    draw: (p) => (
      <g>
        <ellipse cx={WIRE.x} cy={WIRE.y} rx={WIRE.rx} ry={WIRE.ry} fill="none" stroke={COPPER} strokeWidth={14} />
        <g fill={PEN.gold} opacity={p.flow}>
          <polygon points={`${WIRE.x + WIRE.rx},${WIRE.y - 34} ${WIRE.x + WIRE.rx - 30},${WIRE.y + 26} ${WIRE.x + WIRE.rx + 30},${WIRE.y + 26}`} />
          <polygon points={`${WIRE.x - WIRE.rx},${WIRE.y + 34} ${WIRE.x - WIRE.rx - 30},${WIRE.y - 26} ${WIRE.x - WIRE.rx + 30},${WIRE.y - 26}`} />
        </g>
      </g>
    ),
  },
})
const magnet = (k: string, x: number): Sprite => ({
  k,
  type: 'custom',
  n: { x, y: WIRE.y, o: 1 },
  d: {
    id: 'magnet',
    draw: (p) => (
      <g stroke={INK} strokeWidth={6} strokeLinejoin="round">
        <rect x={p.x - 130} y={p.y - 46} width={130} height={92} fill={PEN.red} />
        <rect x={p.x} y={p.y - 46} width={130} height={92} fill={PEN.blue} />
      </g>
    ),
  },
})

/** His turn: each bead walks one more side of the path in the whirl. */
const B: Plane = { x: 150, y: 730, u: 130, w: 5, h: 3 }
const PILE = { x: 1440, y: 700, size: 64 }
const ZONE = { x: PILE.x - 320, y: PILE.y - 130, w: 640, h: 260 }
function walked(n: number): Patch {
  return {
    field: whirl(B),
    path: [round('round', { go: n / 4, pl: B, drawn: true })],
    tags: tags(TURNING.slice(0, n), B),
    bead: walker(n, B),
    sum: line(n === 0 ? ['0'] : [...TURNING_SUM.slice(0, 2 * n - 1), '=', { g: String(2 * n), k: 'total' }], { x: PILE.x, y: 230, size: 96 }),
    line: n === 4 ? line([...ROUND, '=', { g: '8', k: 'eight' }], { x: PILE.x, y: 430, size: 116, gold: ['round', 'eight'] }) : [],
    beads: row(n, PILE.x, PILE.y, PILE.size * 1.15).map((pt, j) => ({ ...beadAt(`b${j}`, pt.x, pt.y, PILE.size, 'blue'), enter: { x: SUPPLY.x, y: SUPPLY.y } })),
  }
}

export const r53: Spec = {
  rank: 53,
  id: 'r53',
  title: 'Contour integral',
  layers: ['field', 'path', 'tags', 'step', 'bead'],
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { field: wind(), path: [round('round')], bead: walker(0) },
      move: 1.2,
      say: 'A steady wind. Walk round the path, back to the start, and add up every push. What do you get?',
      turn: { kind: 'predict', id: 'allround', prompt: 'All the way round, the pushes add up to…', options: [{ label: 'Zero' }, { label: 'More than zero' }] },
    },
    {
      stage: { bead: walker(1), tags: tags(STEADY.slice(0, 1)), sum: sum(STEADY_SUM.slice(0, 1)) },
      move: 1.4,
      say: 'Zero. Along the bottom, the wind is behind us for two steps: two.',
    },
    {
      stage: { bead: walker(2), tags: tags(STEADY.slice(0, 2)), sum: sum(STEADY_SUM.slice(0, 3)) },
      move: 1.4,
      say: 'Up this side, the wind blows across our path: zero.',
    },
    {
      stage: { bead: walker(3), tags: tags(STEADY.slice(0, 3)), sum: sum(STEADY_SUM.slice(0, 5)) },
      move: 1.4,
      also: [{ at: 3, stage: { bead: walker(4), tags: tags(STEADY), sum: sum(STEADY_SUM) }, move: 1.4 }],
      say: 'Along the top, we walk against it: minus two. Then down: zero again.',
    },
    {
      stage: { sum: sum(STEADY_SUM, '0'), ask: line([{ g: '?', k: 'ask' }], { x: SIDE.x + 40, y: 620, size: 240, gold: ['ask'] }) },
      say: 'Altogether, zero. How do we write: add all the way round?',
    },

    // ── 2. What the sign does ──
    {
      act: 2,
      clear: true,
      stage: { plain: line([{ big: '∫', k: 'int' }], { x: 700, y: 480, size: 300 }), line: line([{ big: '∮', k: 'round' }], { x: 1220, y: 480, size: 300, gold: ['round'] }) },
      move: 1.1,
      quiet: 1.4,
      motif: true,
      say: 'The integral sign, with a ring on it: the closed integral. The ring says the path ends where it began.',
    },
    {
      clear: true,
      stage: { field: wind(), path: [round('round', { drawn: true })], bead: walker(0), name: label('name', ['C'], at(W, 3.92, 1.5), { size: 80 }), line: line(ROUND, { x: SIDE.x, y: 500, size: SIDE.size, gold: ['round'] }) },
      say: 'We read it: the integral, round C, of F dot d r. C names the curve.',
      poster: true,
    },
    {
      stage: { step: [arrowOn('tiny', W, [1.72, 0.5], [0.5, 0], { pen: 'gold', w: 16 })], line: line(ROUND, { x: SIDE.x, y: 500, size: SIDE.size, gold: ['dr'] }) },
      say: 'F is the wind. And d r is one tiny step along the curve. The dot asks how much the wind pushes along it.',
    },
    {
      stage: { step: null, bead: walker(1), line: line([...ROUND, '=', '0'], { x: SIDE.x + 30, y: 500, size: 118 }) },
      move: 0.85,
      also: [
        { at: 0.95, stage: { bead: walker(2) }, move: 0.85 },
        { at: 1.9, stage: { bead: walker(3) }, move: 0.85 },
        { at: 2.85, stage: { bead: walker(4) }, move: 0.85 },
      ],
      say: 'The sign adds that up, all the way round. Here: zero.',
    },
    {
      stage: { field: whirl(), name: null, line: null },
      also: [
        { at: 2.5, stage: { bead: walker(1), tags: tags(TURNING.slice(0, 1)), sum: sum(TURNING_SUM.slice(0, 1)) } },
        { at: 3.5, stage: { bead: walker(2), tags: tags(TURNING.slice(0, 2)), sum: sum(TURNING_SUM.slice(0, 3)) } },
        { at: 4.5, stage: { bead: walker(3), tags: tags(TURNING.slice(0, 3)), sum: sum(TURNING_SUM.slice(0, 5)) } },
        { at: 5.5, stage: { bead: walker(4), tags: tags(TURNING), sum: sum(TURNING_SUM) } },
        { at: 6.5, stage: { sum: sum(TURNING_SUM, '8'), line: line([...ROUND, '=', '8'], { x: SIDE.x + 30, y: 640, size: 118, gold: ['round'] }) } },
      ],
      say: 'Now the wind whirls. On every side it pushes us along: two, plus two, plus two, plus two. Eight.',
    },
    {
      stage: { path: [round('round', { s: 0.22, w: 5, drawn: true })], tags: null, bead: null, sum: null, line: line(['∇', '×', F], { x: SIDE.x, y: 500, size: 190 }) },
      move: 1.3,
      say: 'Shrink the loop to almost nothing, and this is the curl: del cross F.',
    },
    {
      clear: true,
      stage: { ends: ended('ends', 480, 320, 190), plain: line([{ big: '∫', from: 'a', to: 'b', k: 'int' }, { fn: 'f' }, '(', 'x', ')', { d: 'x' }], { x: 1240, y: 330, size: 150 }), ring: [ring('ring', 480, 730, 120), ...label('ring/c', ['C'], { x: 670, y: 730 }, { size: 84 })], line: line(ROUND, { x: 1240, y: 730, size: 150 }) },
      say: "The plain integral ran from a to b. A loop has no ends: only a ring, and the curve's name.",
    },

    // ── 3. Where it is used ──
    {
      act: 3,
      clear: true,
      stage: { hill: [heights('heights'), ring('path', HILL.x + 60, HILL.y + 30, 205, { t: 0 })], line: line([...ROUND, '=', '0'], { x: SIDE.x, y: 500, size: 136 }) },
      also: [{ at: 1, stage: { hill: [heights('heights'), ring('path', HILL.x + 60, HILL.y + 30, 205, { t: 1 })] }, move: 4.5 }],
      say: 'Carry a load round a hill and back. Up and down cancel: the work is zero.',
    },
    {
      clear: true,
      stage: { field: whirl(), path: [round('round', { drawn: true })], wheel: [wheel('wheel', at(W, MID[0], MID[1]), 0)], line: line([...ROUND, '=', '8'], { x: SIDE.x + 30, y: 500, size: 118 }) },
      also: [{ at: 1, stage: { wheel: [wheel('wheel', at(W, MID[0], MID[1]), 270)] }, move: 3.2 }],
      say: 'In flowing water, it tells how much the flow turns.',
    },
    {
      clear: true,
      stage: { wire: [wire('wire', 0)], magnet: [magnet('magnet', 1020)], line: line(ROUND, { x: SIDE.x, y: 300, size: 150 }) },
      also: [{ at: 1.2, stage: { wire: [wire('wire', 1)], magnet: [magnet('magnet', 700)] }, move: 2.4 }],
      say: 'Move a magnet up to a loop of wire: electricity is pushed round it.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { ring: [ring('ring', 960, TOP + 50, 84)] },
      say: 'It ends where it began. Which one says that?',
      turn: { kind: 'choose', id: 'closed', prompt: 'It ends where it began. Which one says that?', cards: [ALONG, ROUND], right: 1 },
    },
    {
      clear: true,
      say: 'Each bead walks one side. Add beads until the loop is closed.',
      turn: { kind: 'build', id: 'closeloop', prompt: 'Add beads until the loop is closed.', target: 4, max: 4, zone: ZONE, state: walked },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line([...ROUND, '=', '6'], { y: 480, size: 250 }) }, move: 0.6, say: 'The integral, round C, of F dot d r, equals six.', turn: { kind: 'read', id: 'readround', prompt: 'You read it.' } },

    // ── The end of the road ──
    {
      clear: true,
      stage: { road: line(['=', '+', 'x', { big: 'Σ', k: 'sig' }, { big: '∫', k: 'int' }, { big: '∮', k: 'round' }], { y: 500, size: 190, at: [330, 580, 830, 1090, 1350, 1600], gold: ['round'] }) },
      move: 1.1,
      say: 'That was the last sign on the road. Each one is a short way to write an exact idea. Now you can read them.',
      pad: 1,
    },
  ],
}
