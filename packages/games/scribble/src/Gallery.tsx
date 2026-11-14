import { useState } from 'react'
import { Page } from './Page'
import { layoutOf, savedPage, type Saved } from './model'

const day = (at: number) => new Date(at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

function Sheet({ s, className }: { s: Saved; className?: string }) {
  return <Page lay={layoutOf(s.items, s.perRow, s.whole)} ink={s.ink} className={className} />
}

/** His finished pages, newest first, kept as the chalkboard keeps the day's work: the examples and his writing. To look at, not to write on again. */
export function Gallery({ pages: raw, stars, onDelete, onBack }: { pages: Saved[]; stars: number; onDelete: (id: string) => void; onBack: () => void }) {
  const pages = raw.map(savedPage)
  const [open, setOpen] = useState<Saved | null>(null)
  if (open)
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 p-2">
          <button type="button" onClick={() => setOpen(null)} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Back">
            ←
          </button>
          <div className="flex-1 text-center text-xl font-black text-slate-500 truncate">
            ⭐ {day(open.at)} · {open.items.join(' ')}
          </div>
          <button
            type="button"
            onClick={() => {
              onDelete(open.id)
              setOpen(null)
            }}
            className="w-12 h-12 rounded-2xl bg-white shadow text-2xl"
            aria-label="Delete page"
          >
            🗑️
          </button>
        </div>
        <div className="flex-1 min-h-0 m-2 mt-0 rounded-3xl bg-[#27323A] border-[10px] border-[#D9B382] p-3 flex items-center justify-center">
          <Sheet s={open} className="w-full h-full" />
        </div>
      </div>
    )
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={onBack} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Back">
          ←
        </button>
        <div className="flex-1 text-center text-2xl font-black text-slate-600">My pages · ⭐ {stars}</div>
        <div className="w-12" />
      </div>
      {pages.length === 0 && <div className="flex-1 flex items-center justify-center text-slate-400 text-xl font-bold">Finished pages land here.</div>}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
        {pages.map((s) => (
          <button key={s.id} type="button" data-page={s.id} onClick={() => setOpen(s)} className="aspect-[4/3] bg-[#27323A] rounded-2xl shadow p-2 flex flex-col">
            <Sheet s={s} className="flex-1 min-h-0 w-full" />
            <span className="text-xs font-bold text-slate-300">{day(s.at)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
