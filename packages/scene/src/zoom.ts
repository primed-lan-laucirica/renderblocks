/**
 * The zoom between a window in a world and the whole screen: the opened
 * thing grows out of its window (and shrinks back into it), with its
 * background filling in round it.
 */
export const ZOOM_MS = 650
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'

/** The transform that puts `to` exactly over `from`. */
const over = (from: DOMRect, to: DOMRect) => `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`

/** Grow `el` out of the window at `from`; `fill` fades in round it. */
export function zoomIn(el: HTMLElement, from: DOMRect, fill?: HTMLElement | null) {
  const to = el.getBoundingClientRect()
  el.style.transformOrigin = '0 0'
  el.animate([{ transform: over(from, to) }, { transform: 'none' }], { duration: ZOOM_MS, easing: EASE })
  fill?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ZOOM_MS, easing: EASE })
}

/** Shrink `el` back into the window at `from`; then `done`. */
export function zoomOut(el: HTMLElement, from: DOMRect, fill: HTMLElement | null | undefined, done: () => void) {
  const to = el.getBoundingClientRect()
  el.style.transformOrigin = '0 0'
  const a = el.animate([{ transform: 'none' }, { transform: over(from, to) }], { duration: ZOOM_MS, easing: EASE, fill: 'forwards' })
  fill?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ZOOM_MS, easing: EASE, fill: 'forwards' })
  a.onfinish = done
}
