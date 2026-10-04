import { useMemo, useState } from 'react'
import { wrapFor } from './sheet'
import { Page, type Done, type Pen, type Size } from './Page'
import { effect } from './audio'
import type { TraceSet } from './items'
import { COLOURS, NIBS, SPARSITY, traceStep, type Guides } from './store'

interface Props {
  set: TraceSet
  index: number
  onIndex: (i: number) => void
  guides: Guides
  onGuides: (g: Guides) => void
  pen: Pen
  onPen: (p: Pen) => void
  onFinished: (d: Done) => void
  onBack: () => void
}

/**
 * Tracing (Handwriting-MVP-spec.md: the main app): any item, at full, with
 * pens, guides and sizes. It never moves an item's fade level.
 */
export function TraceScreen({ set, index, onIndex, guides, onGuides, pen, onPen, onFinished, onBack }: Props) {
  const item = set.items[index]
  const [tray, setTray] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [wrap] = useState(() => wrapFor(window.innerWidth, window.innerHeight))

  // One step object per setting, so the page isn't reset when nothing changed.
  const step = useMemo(() => traceStep(guides), [guides])
  const go = (d: number) => onIndex((index + d + set.items.length) % set.items.length)
  const pageDone = done === `${item.key}-${round}`

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={onBack} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold shrink-0" aria-label="Back">
          ←
        </button>
        <div className="flex-1 min-w-0 text-center font-black text-slate-600 truncate">
          {set.title} · {index + 1} / {set.items.length}
        </div>
        <button type="button" onClick={() => setTray(!tray)} className={`h-12 px-4 rounded-2xl shadow text-2xl shrink-0 ${tray ? 'bg-amber-200' : 'bg-white'}`} aria-label="Pens and guides">
          🖍️
        </button>
      </div>

      {tray && <Tray pen={pen} onPen={onPen} guides={guides} onGuides={onGuides} />}

      <Sparsity value={guides.sparsity} onChange={(sparsity) => onGuides({ ...guides, sparsity })} />

      <div className="flex-1 min-h-0 flex items-stretch">
        <SideArrow onClick={() => go(-1)} label="Back a page">‹</SideArrow>
        <Page
          key={`${item.key}-${round}`}
          item={item}
          wrap={wrap}
          step={step}
          lines={guides.lines}
          pen={pen}
          size={guides.size}
          onDone={(d) => {
            setDone(`${item.key}-${round}`)
            effect('correct', 0.5)
            onFinished(d)
          }}
        />
        <SideArrow onClick={() => go(1)} label="Next page" glow={pageDone}>
          ›
        </SideArrow>
      </div>
      {pageDone && (
        <div className="flex justify-center pb-2">
          <button type="button" onClick={() => setRound(round + 1)} className="h-12 px-5 rounded-2xl bg-white shadow font-black text-lg">
            ✏️ Again
          </button>
        </div>
      )}
    </div>
  )
}

function SideArrow({ onClick, label, glow, children }: { onClick: () => void; label: string; glow?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`w-12 sm:w-16 shrink-0 text-5xl font-black ${glow ? 'text-amber-500 animate-pulse' : 'text-slate-300'}`}>
      {children}
    </button>
  )
}

/** Pens, nibs, sizes and guides. */
function Tray({ pen, onPen, guides, onGuides }: { pen: Pen; onPen: (p: Pen) => void; guides: Guides; onGuides: (g: Guides) => void }) {
  const toggle = (on: boolean, label: string, flip: () => void) => (
    <button type="button" onClick={flip} className={`h-10 px-3 rounded-xl font-bold text-sm shadow ${on ? 'bg-sky-500 text-white' : 'bg-white text-slate-500'}`}>
      {label}
    </button>
  )
  return (
    <div className="mx-2 mb-1 p-2 rounded-2xl bg-white/80 shadow flex flex-wrap items-center justify-center gap-2">
      {COLOURS.map((c) => (
        <button key={c} type="button" onClick={() => onPen({ ...pen, color: c, rainbow: false })} aria-label={`Pen ${c}`} className={`w-9 h-9 rounded-full ${!pen.rainbow && pen.color === c ? 'ring-4 ring-slate-800' : ''}`} style={{ background: c }} />
      ))}
      <button type="button" onClick={() => onPen({ ...pen, rainbow: true })} aria-label="Rainbow pen" className={`w-9 h-9 rounded-full ${pen.rainbow ? 'ring-4 ring-slate-800' : ''}`} style={{ background: 'conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)' }} />
      <span className="w-px h-8 bg-slate-200" />
      {NIBS.map((n) => (
        <button key={n.label} type="button" onClick={() => onPen({ ...pen, nib: n.nib })} aria-label={`${n.label} pen`} className={`w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center ${pen.nib === n.nib ? 'ring-4 ring-slate-800' : ''}`}>
          <span className="rounded-full bg-slate-800" style={{ width: n.nib * 60, height: n.nib * 60 }} />
        </button>
      ))}
      <span className="w-px h-8 bg-slate-200" />
      {(['big', 'medium', 'small'] as Size[]).map((s) =>
        toggle(guides.size === s, s === 'big' ? 'Big' : s === 'medium' ? 'Medium' : 'Small', () => onGuides({ ...guides, size: s })),
      )}
      <span className="w-px h-8 bg-slate-200" />
      {/* Shortcuts for the sparsity slider: the solid path, or dots (densest, unless already sparser). */}
      {toggle(guides.sparsity === 0, 'Path', () => onGuides({ ...guides, sparsity: 0 }))}
      {toggle(guides.sparsity > 0, 'Dots', () => onGuides({ ...guides, sparsity: Math.max(1, guides.sparsity) }))}
            {toggle(guides.arrows, 'Arrows', () => onGuides({ ...guides, arrows: !guides.arrows }))}
      {toggle(guides.lines, 'Lines', () => onGuides({ ...guides, lines: !guides.lines }))}
    </div>
  )
}

/** The sparsity slider: from the solid path (left) to start dots only (right). Moving it keeps what's traced. */
function Sparsity({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="mx-auto w-full max-w-xl px-3 flex items-center gap-2">
      <button type="button" onClick={() => onChange(0)} className={`shrink-0 flex items-center gap-1.5 text-sm font-black ${value === 0 ? 'text-sky-600' : 'text-slate-400'}`}>
        <svg viewBox="0 0 24 12" className="w-6 h-3" aria-hidden>
          <line x1={3} y1={6} x2={21} y2={6} stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
        </svg>
        Path
      </button>
      <input
        type="range"
        min={0}
        max={SPARSITY.length - 1}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Path to dots"
        className="flex-1 min-w-0 h-10 accent-sky-500 cursor-pointer"
      />
      <button type="button" onClick={() => onChange(Math.max(1, value))} className={`shrink-0 flex items-center gap-1.5 text-sm font-black ${value > 0 ? 'text-sky-600' : 'text-slate-400'}`}>
        Dots
        <svg viewBox="0 0 24 12" className="w-6 h-3" aria-hidden>
          <circle cx={4} cy={6} r={2.5} fill="currentColor" />
          <circle cx={12} cy={6} r={2.5} fill="currentColor" />
          <circle cx={20} cy={6} r={2.5} fill="currentColor" />
        </svg>
      </button>
    </div>
  )
}
