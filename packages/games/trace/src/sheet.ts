import { layout, LINE_HEIGHT, type Layout } from './glyphs'
import type { Item } from './items'

/** Long items wrap at this width (units): narrower on a screen held upright, so the writing is bigger. */
export const WIDE = 16
export const wrapFor = (w: number, h: number) => (w < h ? 9 : WIDE)

/** An item laid out on its page. */
export function pageLayout(item: Item, wrap = WIDE): Layout {
  return layout(item.text, wrap, item.kind === 'shape' ? item.text : undefined)
}

/** The page's drawing area: the writing, its lines, and a margin (no room kept for a headline or descender it doesn't use). */
export const viewBox = (lay: Layout) => {
  const top = lay.tall ? -0.75 : 0.35
  const bottom = (lay.lines - 1) * LINE_HEIGHT + (lay.deep ? 3.4 : 2.65)
  return { x: -0.8, y: top, w: lay.width + 1.6, h: bottom - top }
}
