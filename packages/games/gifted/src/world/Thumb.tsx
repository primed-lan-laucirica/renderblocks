/**
 * A puzzle type's window on the islands: one of its puzzles, drawn as the
 * puzzle screen draws it (its boxes, slot, "+", arrows and colours, light or
 * dark), as large as the window allows. Rows sit above their choices; grids,
 * pairs and single big pictures sit beside them. With `solved`, the answer is
 * in the slot (an explainer's example, as it ends).
 */
import { memo, type ReactNode } from 'react'
import { CellBox, Slot, StageProvider, palette } from '../explain/kit'
import type { Cell, Item } from '../types'

export type Puzzle = Pick<Item, 'layout' | 'stimulus' | 'blankIndex' | 'choices' | 'answer' | 'touch' | 'speak'>

const W = 640
const H = 360
const PAD = 22
const GAP = 12

/** A row of the puzzle: boxes, slots, and the glue between them ("+", "→", "="). */
type Part = { box: Cell } | { slot: true } | { glue: string }
const width = (p: Part, s: number) => ('glue' in p ? s * 0.42 : s)
const isQ = (c: Cell) => c.kind === 'text' && c.text === '?'

function Row({ parts, x, y, s, answer, dark }: { parts: Part[]; x: number; y: number; s: number; answer?: Cell; dark: boolean }) {
  const c = palette(dark)
  // Where each part starts, left to right.
  const lefts = parts.map((_, i) => x + parts.slice(0, i).reduce((a, q) => a + width(q, s) + GAP, 0))
  return (
    <>
      {parts.map((p, i) => {
        const left = lefts[i]
        if ('glue' in p)
          return (
            <text key={i} x={left + width(p, s) / 2} y={y + s / 2} textAnchor="middle" dominantBaseline="central" fontWeight={800} fontSize={s * 0.4} fill={p.glue === '+' ? c.mark : dark ? '#94a3b8' : '#64748b'}>
              {p.glue}
            </text>
          )
        if ('slot' in p) return <Slot key={i} x={left} y={y} s={s} cell={answer} done={answer ? 1 : 0} />
        return <CellBox key={i} cell={p.box} x={left} y={y} s={s} />
      })}
    </>
  )
}
const rowW = (parts: Part[], s: number) => parts.reduce((a, p) => a + width(p, s), 0) + (parts.length - 1) * GAP

/** The puzzle's own rows (and whether it's laid out beside its choices). */
function rows(q: Puzzle): { rows: Part[][]; beside: boolean } {
  const cell = (c: Cell, i: number): Part => (i === q.blankIndex || isQ(c) ? { slot: true } : { box: c })
  const st = q.stimulus
  switch (q.layout) {
    case 'classify':
      return { rows: [[...st.map(cell), { glue: '+' }, { slot: true }]], beside: false }
    case 'equation':
      return { rows: [st.map((c, i) => (c.kind === 'text' && !isQ(c) ? { glue: c.text } : cell(c, i)))], beside: false }
    case 'lone':
      return { rows: [[{ slot: true }]], beside: false }
    case 'pairs':
      return { rows: Array.from({ length: Math.floor(st.length / 2) }, (_, r) => [cell(st[r * 2], r * 2), { glue: '→' }, cell(st[r * 2 + 1], r * 2 + 1)]), beside: true }
    case 'matrix2':
    case 'matrix3':
    case 'touchGrid': {
      const cols = q.layout === 'matrix2' ? 2 : 3
      return { rows: Array.from({ length: Math.ceil(st.length / cols) }, (_, r) => st.slice(r * cols, r * cols + cols).map((c, k) => cell(c, r * cols + k))), beside: q.layout !== 'touchGrid' || q.choices.length > 0 }
    }
    case 'field':
    case 'fold':
      return { rows: [[{ box: st[0] }]], beside: true }
    default:
      return { rows: [st.map(cell)], beside: false }
  }
}

export const Thumb = memo(function Thumb({ puzzle, dark, solved = false }: { puzzle: Puzzle; dark: boolean; solved?: boolean }) {
  const { rows: rs, beside } = rows(puzzle)
  const choices = puzzle.touch ? [] : puzzle.choices
  const answer = solved ? puzzle.choices[puzzle.answer] : undefined

  const widest = Math.max(...rs.map((r) => r.reduce((a, p) => a + ('glue' in p ? 0.42 : 1), 0)))
  const most = Math.max(...rs.map((r) => r.length))
  const n = rs.length
  let body: ReactNode
  if (beside || !choices.length) {
    // The puzzle on the left (or alone, centred); the choices in two columns on the right.
    const left = choices.length ? W * 0.6 : W
    const s = Math.min((left - 2 * PAD - (most - 1) * GAP) / widest, (H - 2 * PAD - (n - 1) * GAP) / n)
    const top = (H - (n * s + (n - 1) * GAP)) / 2
    const cr = Math.ceil(choices.length / 2)
    const cs = Math.min((W - left - PAD - GAP) / 2, (H - 2 * PAD - (cr - 1) * GAP) / Math.max(cr, 1), s)
    const ctop = (H - (cr * cs + (cr - 1) * GAP)) / 2
    body = (
      <>
        {rs.map((r, k) => (
          <Row key={k} parts={r} x={left / 2 - rowW(r, s) / 2} y={top + k * (s + GAP)} s={s} answer={answer} dark={dark} />
        ))}
        {choices.map((c, i) => (
          <CellBox key={i} cell={c} x={left + (i % 2) * (cs + GAP) + (W - left - PAD - 2 * cs - GAP) / 2} y={ctop + Math.floor(i / 2) * (cs + GAP)} s={cs} />
        ))}
      </>
    )
  } else {
    // The puzzle row above its choices.
    const r = rs[0]
    const s = Math.min((W - 2 * PAD - (r.length - 1) * GAP) / (widest), (H - 2 * PAD - GAP * 2) / 2)
    const cs = Math.min(s, (W - 2 * PAD - (choices.length - 1) * GAP) / choices.length)
    const top = (H - (s + GAP * 2 + cs)) / 2
    const cx = W / 2 - (choices.length * cs + (choices.length - 1) * GAP) / 2
    body = (
      <>
        <Row parts={r} x={W / 2 - rowW(r, s) / 2} y={top} s={s} answer={answer} dark={dark} />
        {choices.map((c, i) => (i === puzzle.answer && solved ? null : <CellBox key={i} cell={c} x={cx + i * (cs + GAP)} y={top + s + GAP * 2} s={cs} />))}
      </>
    )
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id={`thumb-bg-${dark ? 'd' : 'l'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark ? '#1e293b' : '#f5f3ff'} />
          <stop offset="1" stopColor={dark ? '#0f172a' : '#eef2ff'} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#thumb-bg-${dark ? 'd' : 'l'})`} />
      <StageProvider value={{ w: W, h: H, vw: 760, dark }}>{body}</StageProvider>
      {(puzzle.speak || puzzle.touch?.clip) && (
        <text x={16} y={50} fontSize={40}>
          🔊
        </text>
      )}
    </svg>
  )
})
