import { useEffect, useRef, useState } from 'react'
import { Page } from './Page'
import { boxAt, clearBox, DONE_PAUSE_MS, isFull, nextEmpty, undo, type Advance, type Layout, type PromptMode, type Stroke } from './model'
import { say } from './speak'

interface Props {
  tokens: string[]
  lay: Layout
  ink: Stroke[]
  onInk: (ink: Stroke[]) => void
  prompt: PromptMode
  advance: Advance
  /** The page is full and saved: no more writing on it. */
  finished: boolean
  /** Every box is written in and he has stopped: the page as it now is. */
  onFinished: (ink: Stroke[]) => void
  onNew: () => void
  stars: number
  top: React.ReactNode
}

/**
 * The board: what to write is shown above the boxes (as the date is written
 * above them on the chalkboard) and/or spoken; he writes in the boxes with a
 * finger or a stylus. The turn passes to the next empty box a moment after he
 * stops writing (or with Next), and a stroke begun in any other box makes it
 * that box's turn: nothing is locked.
 */
export function Board({ tokens, lay, ink, onInk, prompt, advance, finished, onFinished, onNew, stars, top }: Props) {
  const count = tokens.length
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

  // Whose turn it is, said aloud.
  useEffect(() => {
    if (spoken && !finished && tokens[current]) say(tokens[current])
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
    if (finished || drawing.current) return
    if (e.pointerType === 'pen') pen.current = true
    else if (pen.current && e.pointerType === 'touch') return
    const p = at(e)
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
      <div className="flex items-center gap-2 p-2">{top}</div>
      {/* What to write: above the boxes, never in them. A tap on one says it. */}
      <div className="min-h-16 px-3 flex items-center justify-center gap-x-3 gap-y-1 flex-wrap" data-strip>
        {shown ? (
          tokens.map((t, i) =>
            t ? (
              <button key={i} type="button" data-token={i} onClick={() => say(t)} className={`font-black tabular-nums leading-none transition-all ${i === current && !finished ? 'text-5xl text-amber-500' : 'text-3xl text-slate-400'}`}>
                {t}
              </button>
            ) : null,
          )
        ) : tokens[current] && !finished ? (
          <button type="button" onClick={() => say(tokens[current])} className="w-14 h-14 rounded-full bg-white shadow text-2xl" aria-label="Say it again">
            🔊
          </button>
        ) : null}
        {finished && (
          <span className="text-5xl" data-star>
            ⭐
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 flex items-stretch gap-2 px-2 pb-2">
        <div className="flex-1 min-w-0 rounded-3xl bg-[#27323A] shadow-inner border-[10px] border-[#D9B382] p-2 flex items-center justify-center">
          <Page svgRef={svg} lay={lay} ink={ink} live={live} current={finished ? undefined : current} className="w-full h-full touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </div>
        <div className="flex flex-col items-center justify-end gap-2">
          <div className="flex-1 flex flex-col items-center pt-1 font-black text-slate-500 tabular-nums" aria-label={`${stars} stars`}>
            <span className="text-2xl">⭐</span>
            {stars}
          </div>
          {finished ? (
            <button type="button" onClick={onNew} className={`${tool} bg-amber-400 text-white animate-pulse`} aria-label="A new page">
              ➕
            </button>
          ) : (
            <>
              {advance === 'button' && (
                <button type="button" onClick={pass} disabled={!ink.some((k) => k.box === current)} className={`${tool} ${full ? 'bg-amber-400 text-white' : ''}`} aria-label={full ? 'Done' : 'Next box'}>
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
