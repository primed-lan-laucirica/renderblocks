/**
 * A puzzle type's window when it has no explainer yet: one of its puzzles,
 * drawn with the explainers' kit, big enough to read in a small window (the
 * cells above, the choices below; a grid with the choices beside it).
 */
import { memo } from 'react'
import { CellBox, Paper, Slot, row } from '../explain/kit'
import type { Cell, Item } from '../types'

const isBlank = (c: Cell, i: number, item: Item) => i === item.blankIndex || (c.kind === 'text' && c.text === '?')

export const Sample = memo(function Sample({ item }: { item: Item }) {
  const cells = item.stimulus
  const choices = item.touch ? [] : item.choices.slice(0, 4)
  const sound = !!(item.speak || item.touch?.clip)
  const grid = cells.length > 5
  if (grid) {
    // A matrix or a grid: on the left, the choices in two columns on the right.
    const cols = Math.ceil(Math.sqrt(cells.length))
    const rows = Math.ceil(cells.length / cols)
    const s = Math.min(300, (960 - (rows - 1) * 24) / rows)
    const xs = row(cols, choices.length ? 640 : 960, s, 24)
    const top = 540 - (rows * s + (rows - 1) * 24) / 2
    return (
      <Paper>
        {cells.map((c, i) => {
          const x = xs[i % cols]
          const y = top + Math.floor(i / cols) * (s + 24)
          return isBlank(c, i, item) ? <Slot key={i} x={x} y={y} s={s} /> : <CellBox key={i} cell={c} x={x} y={y} s={s} />
        })}
        {choices.map((c, i) => (
          <CellBox key={i} cell={c} x={1300 + (i % 2) * 300} y={250 + Math.floor(i / 2) * 300} s={270} />
        ))}
        {sound && <text x={80} y={180} fontSize={130}>🔊</text>}
      </Paper>
    )
  }
  // A row: classification is three, a "+", the slot.
  const classify = item.layout === 'classify'
  const n = classify ? 5 : Math.max(cells.length, 1)
  const s = Math.min(320, (1800 - (n - 1) * 30) / n)
  const xs = row(n, 960, s, 30)
  const top = cells.length ? 110 : 0
  const cs = Math.min(320, (1700 - (choices.length - 1) * 60) / Math.max(1, choices.length))
  const cx = row(choices.length, 960, cs, 60)
  const low = cells.length ? 620 : 380
  return (
    <Paper>
      {cells.map((c, i) => (isBlank(c, i, item) ? <Slot key={i} x={xs[i]} y={top} s={s} /> : <CellBox key={i} cell={c} x={xs[i]} y={top} s={s} />))}
      {classify && (
        <>
          <text x={xs[3] + s / 2} y={top + s / 2 + 30} textAnchor="middle" fontSize={100} fontWeight={800} fill="#cbd5e1">
            +
          </text>
          <Slot x={xs[4]} y={top} s={s} />
        </>
      )}
      {choices.map((c, i) => (
        <CellBox key={i} cell={c} x={cx[i]} y={low} s={cs} />
      ))}
      {sound && <text x={80} y={180} fontSize={130}>🔊</text>}
    </Paper>
  )
})
