import { useState } from 'react'
import { InkStrokes, Lines } from './Page'
import { pageLayout, viewBox } from './sheet'
import type { Saved } from './store'

/** A finished page: faint lines and his writing, optionally replaying up to time `until`. */
function Sheet({ s, until, className }: { s: Saved; until?: number; className?: string }) {
  const lay = pageLayout(s.item, s.wrap)
  const vb = viewBox(lay)
  return (
    <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className={className}>
      <Lines lay={lay} />
      <InkStrokes ink={s.ink} pen={s.pen} until={until} />
    </svg>
  )
}

/** His pages (Handwriting-MVP-spec.md: tracing tools), newest first; open one to watch it written again. */
export function Gallery({ pages, onDelete, onBack }: { pages: Saved[]; onDelete: (id: string) => void; onBack: () => void }) {
  const [open, setOpen] = useState<Saved | null>(null)
  const [t, setT] = useState<number | null>(null)

  const replay = (s: Saved) => {
    const end = Math.max(0, ...s.ink.map((k) => k.pts[k.pts.length - 1]))
    const t0 = performance.now()
    const tick = () => {
      const now = performance.now() - t0
      if (now > end + 400) return setT(null)
      setT(now)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  if (open)
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 p-2">
          <button type="button" onClick={() => setOpen(null)} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Back">
            ←
          </button>
          <div className="flex-1" />
          <button type="button" onClick={() => replay(open)} className="w-14 h-14 rounded-2xl bg-white shadow text-2xl" aria-label="Watch it written">
            ▶
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete(open.id)
              setOpen(null)
            }}
            className="w-14 h-14 rounded-2xl bg-white shadow text-2xl"
            aria-label="Delete page"
          >
            🗑️
          </button>
        </div>
        <div className="flex-1 min-h-0 p-3 flex items-center justify-center">
          <Sheet s={open} until={t ?? undefined} className="w-full h-full bg-white rounded-3xl shadow" />
        </div>
      </div>
    )

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={onBack} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Back">
          ←
        </button>
        <div className="flex-1 text-center text-2xl font-black text-slate-600">My pages</div>
        <div className="w-12" />
      </div>
      {pages.length === 0 && <div className="flex-1 flex items-center justify-center text-slate-400 text-xl font-bold">Finished pages land here.</div>}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
        {pages.map((s) => (
          <button key={s.id} type="button" onClick={() => setOpen(s)} className="aspect-[4/3] bg-white rounded-2xl shadow p-1">
            <Sheet s={s} className="w-full h-full" />
          </button>
        ))}
      </div>
    </div>
  )
}
