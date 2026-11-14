import { useEffect, useRef, useState } from 'react'
import { Page } from './Page'
import { boxAt, clearBox, DONE_PAUSE_MS, isFull, nextEmpty, promptAt, undo, type Advance, type Layout, type PromptMode, type Stroke } from './model'
import { say } from './speak'

interface Props {
  items: string[]
  lay: Layout
  ink: Stroke[]
  onInk: (ink: Stroke[]) => void
  prompt: PromptMode
  advance: Advance
  /** The page is full and saved: no more writing on it. */
  finished: boolean
  /** Every box is written in and he has stopped: the page as it now is. */
  onFinished: (ink: Stroke[]) => void
  /** On along the path (none when a grown-up's own page is up). */
  onNext?: () => void
  onAgain: () => void
  stars: number
  /** Where he is: the stage and the page's number on the path. */
  label: string
  left: React.ReactNode
  right: React.ReactNode
}

/**
 * The board: each box with its example written directly above it, and/or
 * spoken; he writes in the boxes with a finger or a stylus. The turn passes
 * to the next empty box a moment after he stops writing (or with Next), and
 * a stroke begun in any other box makes it that box's turn: nothing is locked.
 */
export function Board({ items, lay, ink, onInk, prompt, advance, finished, onFinished, onNext, onAgain, stars, label, left, right }: Props) {
  const count = lay.boxes.length
  const [current, setCurrent] = useState(() => (ink.length ? Math.max(0, nextEmpty(ink, count, count - 1)) : 0))
  const [live, setLive] = useState<number[] | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const drawing = useRef<{ id: number; box: number; pts: number[] } | null>(null)
  // Once a stylus has written here, a palm or a finger makes no marks (until the board is opened again).
  const pen = useRef(false)
  const timer = useRef(0)
  const state = useRef({ ink, current, finished })
  useEffect(() => {
    state.current = { ink, current, finished }
  })
  const spoken = prompt !== 'shown'
  const shown = prompt !== 'spoken'
  const sayBox = (i: number, whole?: boolean) => {
    const b = lay.boxes[i]
    if (b) say(b, items[b.item], whole)
  }

  // Whose turn it is, said aloud (a number, word or sum whole, before its first box).
  useEffect(() => {
    if (spoken && !finished) sayBox(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, spoken, finished])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  /** This box is done: on to the next empty one, or the page is full. */
  const pass = () => {
    const s = state.current
    if (s.finished || !s.ink.some((k) => k.box === s.current)) return
    if (isFull(s.ink, count)) return onFinished(s.ink)
    setCurrent(nextEmpty(s.ink, count, s.current))
  }
  // The timer calls the newest of these: the page as it is when the pause ends, not when it began.
  const latest = useRef(pass)
  useEffect(() => {
    latest.current = pass
  })
  const rest = () => {
    window.clearTimeout(timer.current)
    // The last box gets twice as long: when it is done the page is, and no more can be added.
    if (advance === 'pause') timer.current = window.setTimeout(() => latest.current(), isFull(state.current.ink, count) ? 2 * DONE_PAUSE_MS : DONE_PAUSE_MS)
  }

  const at = (e: React.PointerEvent | PointerEvent) => {
    const m = svg.current!.getScreenCTM()!
    return { x: (e.clientX - m.e) / m.a, y: (e.clientY - m.f) / m.d }
  }
  const down = (e: React.PointerEvent) => {
    if (drawing.current) return
    const p = at(e)
    // A tap on an example says it.
    const ex = shown ? promptAt(lay, p.x, p.y) : -1
    if (ex >= 0) return sayBox(ex, true)
    if (finished) return
    if (e.pointerType === 'pen') pen.current = true
    else if (pen.current && e.pointerType === 'touch') return
    const box = boxAt(lay, p.x, p.y)
    if (box < 0) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // No such pointer any more: the stroke still starts.
    }
    window.clearTimeout(timer.current)
    drawing.current = { id: e.pointerId, box, pts: [p.x, p.y] }
    setLive([p.x, p.y])
    if (box !== current) setCurrent(box)
  }
  const move = (e: React.PointerEvent) => {
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    const all = e.nativeEvent.getCoalescedEvents?.() ?? []
    for (const ev of all.length ? all : [e.nativeEvent]) {
      const p = at(ev)
      const n = d.pts.length
      if (Math.hypot(p.x - d.pts[n - 2], p.y - d.pts[n - 1]) > 0.008) d.pts.push(p.x, p.y)
    }
    setLive([...d.pts])
  }
  const up = (e: React.PointerEvent) => {
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    drawing.current = null
    setLive(null)
    const next = [...state.current.ink, { box: d.box, pts: d.pts.map((v) => Math.round(v * 1000) / 1000) }]
    state.current = { ...state.current, ink: next, current: d.box }
    onInk(next)
    rest()
  }

  const full = isFull(ink, count)
  const tool = 'w-16 h-16 rounded-2xl bg-white/90 shadow text-3xl font-black text-slate-700 active:scale-95 transition-transform disabled:opacity-30'
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2">
        {left}
        <div className="flex-1 flex items-center justify-center gap-3">
          <span className="text-lg font-black text-slate-400" data-label>
            {label}
          </span>
          {!shown && !finished && (
            <button type="button" onClick={() => sayBox(current, true)} className="w-12 h-12 rounded-full bg-white shadow text-2xl" aria-label="Say it again">
              🔊
            </button>
          )}
          {finished && (
            <span className="text-4xl leading-none" data-star>
              ⭐
            </span>
          )}
        </div>
        {right}
      </div>
      <div className="flex-1 min-h-0 flex items-stretch gap-2 px-2 pb-2">
        <div className="flex-1 min-w-0 rounded-3xl bg-[#27323A] shadow-inner border-[10px] border-[#D9B382] p-3 flex items-center justify-center">
          <Page svgRef={svg} lay={lay} ink={ink} live={live} current={finished ? undefined : current} examples={shown} className="w-full h-full touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </div>
        <div className="flex flex-col items-center justify-end gap-2">
          <div className="flex-1 flex flex-col items-center pt-1 font-black text-slate-500 tabular-nums" aria-label={`${stars} stars`}>
            <span className="text-2xl">⭐</span>
            {stars}
          </div>
          {finished ? (
            <>
              <button type="button" onClick={onAgain} className={tool} aria-label="This page again">
                ↻
              </button>
              {onNext && (
                <button type="button" onClick={onNext} className={`${tool} bg-amber-400 text-white animate-pulse`} aria-label="Next page">
                  ➜
                </button>
              )}
            </>
          ) : (
            <>
              {advance === 'button' && (
                <button type="button" onClick={() => latest.current()} disabled={!ink.some((k) => k.box === current)} className={`${tool} ${full ? 'bg-amber-400 text-white' : ''}`} aria-label={full ? 'Done' : 'Next box'}>
                  {full ? '⭐' : '➜'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!ink.length) return
                  const last = ink[ink.length - 1].box
                  onInk(undo(ink))
                  setCurrent(last)
                  rest()
                }}
                disabled={!ink.length}
                className={tool}
                aria-label="Undo"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={() => {
                  window.clearTimeout(timer.current)
                  onInk(clearBox(ink, current))
                }}
                disabled={!ink.some((k) => k.box === current)}
                className={tool}
                aria-label="Clear this box"
              >
                🧽
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
