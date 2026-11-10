/* eslint-disable react-refresh/only-export-components -- the cover and what it is drawn from */
/**
 * A rank's cover: its sign (or family of signs) large on the paper. It is
 * the picture in the rank's window on the road and the first thing the
 * player shows, so the zoom in lands on the same picture.
 */
import { memo } from 'react'
import { H, W } from '@renderblocks/scene/scene'
import { rankOf, signsOf } from './data/path'
import { items, place, widthOf, type Tok } from './kit/glyphs'
import { INK, PAPER, SERIF } from './kit/look'
import { balance, beadsOn, line, Sprites } from './kit/sprites'

/** What the sheet writes in words, as it is shown. */
const SHOWN: Record<string, string | null> = { '(decimal point)': '.', '(or bold v)': null }

/** Signs that only show round something: each on the smallest line that carries it. */
const WORN: Record<number, Tok[][]> = {
  7: [['2', { sup: '3' }]],
  8: [[{ root: '9' }]],
  9: [['0', '.', '5'], ['50', '%']],
  11: [['|', '−3', '|']],
  12: [['x'], ['y'], ['n']],
  14: [['x', { sub: 'i' }]],
  15: [[{ fn: 'f' }, '(', 'x', ')']],
  18: [['n', '!']],
  27: [['{', 'x', '∣', '…', '}']],
  32: [['A', '×', 'B']],
  33: [[{ fn: 'f' }, ':', 'A', '→', 'B'], ['↦'], ['∘'], [{ fn: 'f' }, { sup: '−1' }]],
  34: [[':='], ['≡']],
  36: [['Δ', 'x']],
  37: [[{ big: 'lim', from: ['x', '→', 'a'] }]],
  38: [[{ frac: [[{ d: 'y' }], [{ d: 'x' }]] }], [{ fn: 'f' }, '′'], [{ dot: 'x' }]],
  39: [[{ big: '∫', from: 'a', to: 'b' }]],
  40: [[{ frac: [[{ d: 'f', round: true }], [{ d: 'x', round: true }]] }]],
}

/** A rank's signs as little lines for its cover: each sign alone (the fraction bar inside a half), or as it is worn. */
export const coverToks = (rank: number): Tok[][] => WORN[rank] ?? signsOf(rank).map((g) => [g === 'frac' ? { frac: ['1', '2'] } : g])

export const Cover = memo(function Cover({ rank, dim = false }: { rank: number; dim?: boolean }) {
  const groups = coverToks(rank)
  let body
  if (groups.length) {
    const wide = groups.map((toks) => {
      const list = items(toks)
      const xs = place(list, 1)
      return xs[xs.length - 1] - xs[0] + (widthOf(list[0]) + widthOf(list[list.length - 1])) / 2
    })
    // Brackets stand apart, as round something.
    const apart = rank === 5 ? 1.2 : 0.5
    const units = wide.reduce((w, v) => w + v, 0) + (groups.length - 1) * apart
    const size = Math.min(520, 1500 / units)
    let x = W / 2 - (units * size) / 2
    body = groups.map((toks, i) => {
      const mid = x + (wide[i] * size) / 2
      x += (wide[i] + apart) * size
      return <Sprites key={i} list={line(toks, { x: mid, y: H / 2, size })} />
    })
  } else {
    const text = rankOf(rank)
      .glyphs.map((g) => (g in SHOWN ? SHOWN[g] : g))
      .filter((g): g is string => g !== null)
      .join('   ')
    const size = Math.min(420, 1500 / (text.length * 0.52))
    body = (
      <text x={W / 2} y={H / 2} fontFamily={SERIF} fontSize={size} fill={INK} textAnchor="middle" dominantBaseline="central" style={{ whiteSpace: 'pre' }}>
        {text}
      </text>
    )
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: 'block' }}>
      <rect width={W} height={H} fill={PAPER} />
      <g opacity={dim ? 0.38 : 1}>{body}</g>
    </svg>
  )
})

/** The Bench's window: the bench itself, small (a true line over a level beam). */
export const BenchCover = memo(function BenchCover() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: 'block' }}>
      <rect width={W} height={H} fill={PAPER} />
      <Sprites list={[...balance({ y: 520, left: beadsOn({ n: 3, colour: 'blue' }, { n: 2, colour: 'red' }), right: beadsOn(5) }), ...line(['3', '+', '2', '=', '5'], { y: 250, size: 230, gold: ['='] })]} />
    </svg>
  )
})
