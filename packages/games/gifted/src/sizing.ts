/**
 * How big the puzzle screen draws a puzzle's cells: the largest that fits
 * both the width and the height the screen has, capped at the size each
 * layout would like. Shared by the puzzle screen and the explainers, so an
 * explainer's last frame is the puzzle it hands over to, on any screen (a
 * tablet's landscape fits everything at full size; a phone's landscape is
 * short, and the cells shrink to fit).
 */
import type { Item } from './types'

type Sized = Pick<Item, 'layout' | 'stimulus' | 'touch'>

/** The header, the screen's padding and the gaps above the puzzle. */
const CHROME = 92
/** Below the puzzle: the explanation line (48), "Show me" (36) and the gaps between (3 × 12). */
const BELOW = 120

/** Height left for the puzzle and its choices. */
const room = (vh: number) => vh - CHROME - BELOW

/** Pattern Completion's board (the pattern with the hole), so it and its pieces fit. */
export function fieldBoard(q: Sized, vw: number, vh: number) {
  const f = q.stimulus[0]
  const share = f?.kind === 'field' && f.hole ? f.hole.n / f.grid.length : 0.4
  return Math.max(120, Math.floor(Math.min(240, vw - 40, room(vh) / (1 + share))))
}

export function cellPx(q: Sized, vw: number, vh: number) {
  // Largest cell that lets `count` of them (plus any glue glyph) fit the
  // width we actually have, capped at the size the layout would like.
  const fit = (count: number, extra = 0) => Math.floor((Math.min(vw, 760) - 28 - extra - (count - 1) * 8) / count)
  const cap = (desired: number, count: number, extra = 0) => Math.max(44, Math.min(desired, fit(count, extra)))
  // …and that lets `rows` of them (with `gaps` between) and the choices below fit the height.
  const tall = (s: number, rows: number, gaps = 0) => {
    const choices = q.touch ? 0 : 1
    return Math.max(36, Math.min(s, Math.floor((room(vh) - gaps) / (rows + choices))))
  }
  const n = q.stimulus.length
  switch (q.layout) {
    case 'classify':
      // three stimuli + the "+" glyph + the answer slot
      return tall(cap(88, 4, 30), 1)
    case 'row':
      return tall(cap(88, Math.max(n, 4)), 1)
    case 'matrix3':
      return tall(cap(76, 3), 3, 16)
    case 'matrix2':
      return tall(cap(88, 2), 2, 8)
    case 'pairs': {
      const rows = Math.floor(n / 2)
      return tall(cap(68, 2, 30), rows, (rows - 1) * 8)
    }
    case 'equation':
      return tall(cap(68, n, 20), 1)
    case 'fold':
      return tall(cap(136, 2, 30), 1)
    case 'touchGrid': {
      const rows = Math.ceil(n / 3)
      return tall(cap(84, 3), rows, (rows - 1) * 12)
    }
    case 'lone':
      return tall(cap(120, 3), 1)
    case 'field': {
      const f = q.stimulus[0]
      if (f.kind === 'field' && f.hole) return Math.round((f.hole.n / f.grid.length) * fieldBoard(q, vw, vh))
      return tall(cap(88, 3), 1)
    }
    default:
      return tall(cap(88, 4), 1)
  }
}
