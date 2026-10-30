/* eslint-disable react-refresh/only-export-components -- the explainers' board: the puzzle layout engine and its script types */
/**
 * The puzzle screen's body, animated: any puzzle laid out exactly as the
 * puzzle screen lays it out (its cell sizes, gaps, glue, slot, choices row),
 * with a script of what happens when: pieces pop in, rings show what to
 * notice, a note appears where the puzzle prints its explanation, wrong
 * choices fade, the answer flies into its slot, grid pictures are tapped.
 * Everything is a pure function of t.
 */
import type { ReactNode } from 'react'
import { outBack, p, smooth } from '@renderblocks/scene'
import { CellView } from '../Figure'
import type { Cell } from '../types'
import { cellPx, fieldBoard } from '../sizing'
import type { Puzzle } from '../world/Thumb'
import { CellBox, GREEN, Note, Paper, Slot, palette, useStage } from './kit'

export interface Box {
  x: number
  y: number
  s: number
}
interface Glue {
  x: number
  y: number
  text: string
  size: number
  fill: string
}
export interface Geo {
  /** Each stimulus cell's box (a blank's is its slot). */
  cells: Box[]
  /** Where the answer goes. */
  slot: Box | null
  glue: Glue[]
  choices: Box[]
  /** Pattern Completion: the big pattern, and its hole. */
  field?: { box: Box; hole: Box }
  /** Picture Memory: where the pictures to remember sit while he studies them. */
  study: Box[]
  top: number
  /** The bottom of the choices row (taller than the stage on a very short screen). */
  bottom: number
  /** Where the puzzle prints its explanation. */
  note: number
  s: number
}

const isQ = (c: Cell) => c.kind === 'text' && c.text === '?'
const isBlank = (q: Puzzle, c: Cell, i: number) => i === q.blankIndex || isQ(c) || (c.kind === 'glyphs' && c.glyphs.length === 0)

/** Lay out a run of items (boxes and glue) centred on cx, `gap` apart; returns each item's left edge. */
function run(widths: number[], cx: number, gap: number) {
  const total = widths.reduce((a, w) => a + w, 0) + (widths.length - 1) * gap
  let x = cx - total / 2
  return widths.map((w) => {
    const at = x
    x += w + gap
    return at
  })
}

export function geometry(q: Puzzle, w: number, h: number, vw: number, vh: number, dark: boolean, study: Cell[] = []): Geo {
  const c = palette(dark)
  const s = cellPx(q, vw, vh)
  const cs = Math.min(s, Math.floor((Math.min(vw, 760) - 28 - 16) / 3))
  const choiceCount = q.touch ? 0 : q.choices.length
  const cells: Box[] = []
  const glue: Glue[] = []
  let slot: Box | null = null
  let field: Geo['field']
  // The puzzle's own block, laid out from y = 0; moved down once its height is known.
  let stimH = s
  const cx = w / 2
  const st = q.stimulus
  const lineOf = (items: ({ cell: number } | { glue: string; w: number; size: number; fill: string } | { slot: true })[], y: number, gap: number) => {
    const xs = run(items.map((it) => ('glue' in it ? it.w : s)), cx, gap)
    items.forEach((it, k) => {
      if ('glue' in it) glue.push({ x: xs[k] + it.w / 2, y: y + s / 2, text: it.glue, size: it.size, fill: it.fill })
      else if ('slot' in it) slot = { x: xs[k], y, s }
      else {
        cells[it.cell] = { x: xs[k], y, s }
        if (isBlank(q, st[it.cell], it.cell)) slot = cells[it.cell]
      }
    })
  }
  switch (q.layout) {
    case 'classify':
      lineOf([...st.map((_, i) => ({ cell: i })), { glue: '+', w: 22, size: 24, fill: c.mark }, { slot: true }], 0, 8)
      break
    case 'row':
      lineOf(st.map((_, i) => ({ cell: i })), 0, 8)
      break
    case 'equation':
      lineOf(
        st.map((cell, i) => (cell.kind === 'text' && !isQ(cell) ? { glue: cell.text, w: 30, size: 36, fill: dark ? '#cbd5e1' : '#64748b' } : isQ(cell) ? { slot: true as const } : { cell: i })),
        0,
        4,
      )
      break
    case 'lone':
      slot = { x: cx - s / 2, y: 0, s }
      break
    case 'pairs': {
      const rows = Math.floor(st.length / 2)
      for (let r = 0; r < rows; r++) lineOf([{ cell: r * 2 }, { glue: '→', w: 24, size: 24, fill: dark ? '#64748b' : '#94a3b8' }, { cell: r * 2 + 1 }], r * (s + 8), 8)
      stimH = rows * s + (rows - 1) * 8
      break
    }
    case 'fold':
      lineOf([{ cell: 0 }, { glue: '→', w: 30, size: 30, fill: dark ? '#64748b' : '#94a3b8' }, { slot: true }], 0, 12)
      break
    case 'field': {
      const B = fieldBoard(q, vw, vh)
      const f = st[0]
      const n = f.kind === 'field' ? f.grid.length : 8
      const hole = f.kind === 'field' && f.hole ? f.hole : { r: 0, c: 0, n: 1 }
      const box = { x: cx - B / 2, y: 0, s: B }
      cells[0] = box
      // The hole's dashed outline sits in the frame's padding box (inside its 4 px border).
      const inner = B - 8
      field = { box, hole: { x: box.x + 4 + (hole.c / n) * inner, y: 4 + (hole.r / n) * inner, s: (hole.n / n) * inner } }
      slot = field.hole
      stimH = B
      break
    }
    case 'touchGrid':
    case 'matrix2':
    case 'matrix3': {
      const cols = q.layout === 'matrix2' ? 2 : 3
      const gap = q.layout === 'touchGrid' ? 12 : 8
      const rows = Math.ceil(st.length / cols)
      const xs = run(Array(cols).fill(s), cx, gap)
      st.forEach((cell, i) => {
        cells[i] = { x: xs[i % cols], y: Math.floor(i / cols) * (s + gap), s }
        if (isBlank(q, cell, i)) slot = cells[i]
      })
      stimH = rows * s + (rows - 1) * gap
      break
    }
  }
  // The choices wrap onto more rows when they don't fit across (flex-wrap, 12 apart), as on a phone held upright.
  const perRow = Math.max(1, Math.min(choiceCount, Math.floor((w + 12) / (cs + 12))))
  const choiceRows = choiceCount ? Math.ceil(choiceCount / perRow) : 0
  const choicesH = choiceRows ? choiceRows * cs + (choiceRows - 1) * 12 : 0
  const total = stimH + 12 + 48 + 12 + 36 + 12 + choicesH
  const top = Math.max(8, (h - total) / 2)
  const down = (b: Box) => ({ ...b, y: b.y + top })
  const low = top + stimH + 120
  const choiceBoxes: Box[] = []
  for (let r = 0; r < choiceRows; r++) {
    const inRow = Math.min(perRow, choiceCount - r * perRow)
    run(Array(inRow).fill(cs), cx, 12).forEach((x) => choiceBoxes.push({ x, y: low + r * (cs + 12), s: cs }))
  }
  // Picture Memory's study: the pictures at 104 px, 12 apart, centred.
  const sxs = run(Array(study.length).fill(104), cx, 12)
  return {
    cells: cells.map(down),
    slot: slot ? down(slot) : null,
    glue: glue.map((g) => ({ ...g, y: g.y + top })),
    choices: choiceBoxes,
    field: field ? { box: down(field.box), hole: down(field.hole) } : undefined,
    study: sxs.map((x) => ({ x, y: h / 2 - 52 - 20, s: 104 })),
    top,
    note: top + stimH + 12 + 24,
    s,
    bottom: top + total,
  }
}

/** Something to notice: a ring round one cell, or round a group of them (`choice` rings the choices instead). */
export interface Mark {
  cells: number[]
  from: number
  to?: number
  choice?: boolean
  colour?: string
}
export interface Script {
  puzzle: Puzzle
  /** The puzzle's cells pop in, one after another, from here. */
  appear: number
  step?: number
  /** The choices rise in. */
  choices?: number
  /** Their order of rising (default left to right), e.g. one at a time as each is named. */
  choiceTimes?: number[]
  marks?: Mark[]
  note?: { text: string; from: number; colour?: string }
  /** Wrong choices fading out, as they're ruled out. */
  ruleOut?: { choice: number; at: number }[]
  /** The answer flies into its slot. */
  answer?: [number, number]
  /** Grid pictures tapped (green, as when he taps them). */
  taps?: { cell: number; at: number }[]
  /** Picture Memory: the pictures to remember, shown from…to; the grid comes after. */
  memory?: { cells: Cell[]; from: number; to: number }
  /** Drawn over everything (arcs, a sheet unfolding). */
  over?: (g: Geo, t: number) => ReactNode
}

export function Board({ t, script }: { t: number; script: Script }) {
  const st = useStage()
  const c = palette(st.dark)
  const q = script.puzzle
  const g = geometry(q, st.w, st.h, st.vw, st.vh ?? 800, st.dark, script.memory?.cells)
  const step = script.step ?? 0.4
  const appearAt = (i: number) => script.appear + i * step
  const pop = (i: number) => outBack(p(t, appearAt(i), appearAt(i) + 0.4))
  const into = script.answer ? smooth(p(t, ...script.answer)) : 0
  const landed = script.answer ? p(t, script.answer[1] - 0.05, script.answer[1]) : 0
  const answerCell = q.choices[q.answer]
  const tapped = (i: number) => (script.taps ?? []).some((k) => k.cell === i && t >= k.at)
  const grid = !script.memory || t >= script.memory.to
  const allOrder = [...g.cells.keys()]
  const marks = (script.marks ?? []).filter((m) => t >= m.from && (m.to === undefined || t < m.to))
  const ring = (i: number, choice = false) => marks.find((m) => !!m.choice === choice && m.cells.length === 1 && m.cells[0] === i)

  const out: ReactNode[] = []
  // Picture Memory: the pictures to remember, then a bar running down.
  if (script.memory) {
    const m = script.memory
    const k = smooth(p(t, m.from, m.from + 0.4)) * (1 - smooth(p(t, m.to - 0.4, m.to)))
    if (k > 0) {
      m.cells.forEach((cell, i) => out.push(<CellBox key={`m${i}`} cell={cell} x={g.study[i].x} y={g.study[i].y} s={104} o={k} />))
      const bw = 192
      const left = 1 - p(t, m.from + 0.4, m.to - 0.4)
      out.push(
        <g key="bar" opacity={k}>
          <rect x={st.w / 2 - bw / 2} y={g.study[0].y + 104 + 16} width={bw} height={8} rx={4} fill={st.dark ? '#334155' : '#ede9fe'} />
          <rect x={st.w / 2 - bw / 2} y={g.study[0].y + 104 + 16} width={bw * left} height={8} rx={4} fill="#8b5cf6" />
        </g>,
      )
    }
  }
  if (grid) {
    // The puzzle: the field, the cells (a blank as its slot), the glue.
    if (g.field) {
      const k = pop(0)
      const f = g.field
      out.push(<CellBox key="field" cell={q.stimulus[0]} x={f.box.x} y={f.box.y} s={f.box.s} o={Math.min(1, k * 2)} />)
      const done = landed
      out.push(
        <g key="hole" opacity={Math.min(1, k * 2)}>
          {done > 0 && (
            <svg x={f.hole.x} y={f.hole.y} width={f.hole.s} height={f.hole.s} opacity={done}>
              <CellView cell={answerCell} dark={st.dark} />
            </svg>
          )}
          <rect x={f.hole.x + 2} y={f.hole.y + 2} width={f.hole.s - 4} height={f.hole.s - 4} rx={6} fill="none" stroke={done > 0.5 ? GREEN : '#c4b5fd'} strokeWidth={4} strokeDasharray="10 7" />
        </g>,
      )
    } else {
      allOrder.forEach((i) => {
        const b = g.cells[i]
        if (!b) return
        const k = pop(i)
        if (g.slot === b) {
          out.push(<Slot key={`c${i}`} x={b.x} y={b.y} s={b.s} o={smooth(p(t, appearAt(i), appearAt(i) + 0.4))} cell={answerCell} done={landed} />)
          return
        }
        const hit = tapped(i)
        const r = ring(i)
        out.push(<CellBox key={`c${i}`} cell={q.stimulus[i]} x={b.x} y={b.y} s={b.s} o={Math.min(1, k * 2)} scale={(0.6 + 0.4 * k) * (hit ? 1.04 : 1)} ring={hit ? GREEN : r ? (r.colour ?? c.accent) : undefined} />)
        if (hit) out.push(<rect key={`h${i}`} x={b.x - 5} y={b.y - 5} width={b.s + 10} height={b.s + 10} rx={20} fill="none" stroke="#6ee7b7" strokeWidth={5} opacity={0.8} />)
      })
      // A separate slot (classify, fold, lone, equation).
      if (g.slot && !g.cells.includes(g.slot)) {
        const at = appearAt(Math.max(1, g.cells.filter(Boolean).length))
        out.push(<Slot key="slot" x={g.slot.x} y={g.slot.y} s={g.slot.s} o={smooth(p(t, at, at + 0.4))} cell={answerCell} done={landed} />)
      }
      g.glue.forEach((gl, k) => {
        // It appears between the cells it joins: after those before it (above it, or left of it on its line).
        const before = g.cells.filter((b) => b && (b.y + b.s / 2 < gl.y - 1 || (Math.abs(b.y + b.s / 2 - gl.y) < 1 && b.x < gl.x))).length
        const at = appearAt(before) - step / 2
        out.push(
          <text key={`g${k}`} x={gl.x} y={gl.y} textAnchor="middle" dominantBaseline="central" fontWeight={800} fontSize={gl.size} fill={gl.fill} opacity={smooth(p(t, at, at + 0.4))}>
            {gl.text}
          </text>,
        )
      })
    }
    // Group rings: round several cells at once.
    marks
      .filter((m) => m.cells.length > 1)
      .forEach((m, k) => {
        const bs = m.cells.map((i) => (m.choice ? g.choices[i] : g.cells[i])).filter(Boolean)
        const x0 = Math.min(...bs.map((b) => b.x)) - 7
        const y0 = Math.min(...bs.map((b) => b.y)) - 7
        const x1 = Math.max(...bs.map((b) => b.x + b.s)) + 7
        const y1 = Math.max(...bs.map((b) => b.y + b.s)) + 7
        const o = smooth(p(t, m.from, m.from + 0.4))
        out.push(<rect key={`grp${k}`} x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={22} fill="none" stroke={m.colour ?? c.accent} strokeWidth={3.5} opacity={o} />)
      })
  }
  // The note, where the puzzle prints its explanation.
  if (script.note) out.push(<Note key="note" x={st.w / 2} y={g.note} text={script.note.text} o={smooth(p(t, script.note.from, script.note.from + 0.5))} fill={script.note.colour ?? c.accent} />)
  // The choices: rising in, fading as they're ruled out, the answer flying to its slot.
  if (grid && !q.touch && script.choices !== undefined) {
    q.choices.forEach((cell, i) => {
      const at = script.choiceTimes?.[i] ?? script.choices! + i * 0.2
      const rise = smooth(p(t, at, at + 0.5))
      const b = g.choices[i]
      const gone = (script.ruleOut ?? []).find((r) => r.choice === i)
      const o = gone ? smooth(p(t, gone.at, gone.at + 0.4)) : 0
      if (i === q.answer && script.answer && g.slot) {
        if (landed >= 1) return
        const x = b.x + (g.slot.x - b.x) * into
        const y = b.y + (g.slot.y - b.y) * into - Math.sin(into * Math.PI) * g.s * 0.8
        out.push(<CellBox key={`ch${i}`} cell={cell} x={x} y={y + (1 - rise) * 20} s={b.s + (g.slot.s - b.s) * into} o={rise} />)
        return
      }
      const r = ring(i, true)
      out.push(<CellBox key={`ch${i}`} cell={cell} x={b.x} y={b.y + (1 - rise) * 20} s={b.s} o={rise * (1 - 0.7 * o)} scale={1 - 0.1 * o} ring={r ? (r.colour ?? c.accent) : undefined} />)
      if (o > 0) out.push(<path key={`x${i}`} d={`M ${b.x + b.s * 0.25} ${b.y + b.s * 0.25} L ${b.x + b.s * 0.75} ${b.y + b.s * 0.75}`} stroke="#94a3b8" strokeWidth={5} strokeLinecap="round" opacity={o * 0.8} />)
    })
  }
  // If it still doesn't fit (a very short screen), the whole drawing shrinks to fit, rather than running off the edge.
  const need = Math.max(st.h, g.bottom + 8)
  return (
    <Paper h={need}>
      {out}
      {script.over?.(g, t)}
    </Paper>
  )
}
