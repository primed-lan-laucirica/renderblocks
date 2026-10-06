import { useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { DECKS, SECTIONS, deal, rightBin, type Bin, type Card, type Deck } from './decks'
import { chorus, effect } from './sounds'

/** A round in play: the cards still to sort, and where each sorted card is (in sorting order, per bin). */
interface Round {
  deck: Deck
  /** A switch deck's second round: sorting the same cards by its second rule. */
  second: boolean
  bins: Bin[]
  left: Card[]
  placed: Card[][]
  total: number
  /** After a check: the cards in the wrong bin (cleared one by one as he moves them). */
  wrong: Set<string> | null
  /** Everything checked right. */
  done: boolean
}

interface Drag {
  card: Card
  /** Where it came from: the deck, or a bin. */
  from: 'deck' | number
  x: number
  y: number
  moved: boolean
}

function start(deck: Deck, second = false, cards = deal(deck)): Round {
  const bins = second && deck.then ? deck.then.bins : deck.bins
  return { deck, second, bins, left: cards, placed: bins.map(() => []), total: cards.length, wrong: null, done: false }
}

/**
 * Sort (Drive: Sorting/Sorting-research.md): flashcards sorted into named
 * groups, the skill behind the gifted tests' classification items. One card
 * at a time; drag it (or tap a bin) to sort it. When the deck's done he
 * checks his own sort: wrong cards wobble for him to move, and he checks
 * again. Every bin keeps count.
 */
function App({ services }: GameProps) {
  const [round, setRound] = useState<Round | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)

  if (!round) return <Picker onPick={(d) => setRound(start(d))} onHome={services.exitToHome} />

  const r = round
  const sorted = r.placed.reduce((n, p) => n + p.length, 0)

  /** Put a card in bin b (from the deck or another bin). */
  const place = (card: Card, from: 'deck' | number, b: number) => {
    if (from === b || r.done) return
    const placed = r.placed.map((p, i) => (i === from ? p.filter((c) => c.emoji !== card.emoji) : p))
    placed[b] = [...placed[b], card]
    const left = from === 'deck' ? r.left.filter((c) => c.emoji !== card.emoji) : r.left
    let wrong = r.wrong
    if (wrong?.has(card.emoji)) {
      wrong = new Set(wrong)
      wrong.delete(card.emoji)
    }
    effect('pop', 0.5)
    setRound({ ...r, placed, left, wrong })
  }

  const check = () => {
    const wrong = new Set<string>()
    r.placed.forEach((p, b) => p.forEach((c) => rightBin(r.deck, c, r.second) !== b && wrong.add(c.emoji)))
    if (wrong.size === 0) {
      effect('celebrate', 0.7)
      chorus('yes')
      setRound({ ...r, wrong: null, done: true })
    } else {
      effect('wrong', 0.7)
      chorus('no')
      setRound({ ...r, wrong })
    }
  }

  // Dragging: the card follows the finger; let go over a bin to sort it there.
  const down = (e: React.PointerEvent, card: Card, from: 'deck' | number) => {
    if (r.done) return
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    setDrag({ card, from, x: e.clientX, y: e.clientY, moved: false })
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved: drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6 })
  }
  const up = (e: React.PointerEvent) => {
    if (!drag) return
    const at = document.elementsFromPoint(e.clientX, e.clientY).map((el) => (el as HTMLElement).closest?.('[data-bin]')).find(Boolean) as HTMLElement | undefined
    setDrag(null)
    if (at) place(drag.card, drag.from, Number(at.dataset.bin))
  }

  const current = r.left[0]
  const switchNext = r.done && r.deck.then && !r.second

  return (
    <div className="h-dvh w-full flex flex-col bg-slate-900 text-white select-none overflow-hidden" onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
      <style>{`@keyframes sort-wobble { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-12deg) } 75% { transform: rotate(12deg) } }`}</style>
      {/* Top: back, what we're sorting by, and how many sorted so far. */}
      <div className="flex items-center gap-3 p-3 shrink-0">
        <button type="button" onClick={() => setRound(null)} className="w-12 h-12 rounded-full bg-white/10 text-2xl font-bold" aria-label="Back">
          ←
        </button>
        <div className="flex-1 text-lg font-bold text-slate-300 truncate">{r.bins.map((b) => b.label).join(' · ')}</div>
        <div className="text-3xl font-black tabular-nums">
          {sorted} / {r.total}
        </div>
      </div>

      {/* The card to sort, or (when they're all sorted) the check. */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 p-2">
        {current ? (
          <div
            onPointerDown={(e) => down(e, current, 'deck')}
            className={`touch-none cursor-grab rounded-3xl bg-white text-slate-900 shadow-xl flex flex-col items-center justify-center w-44 h-52 ${drag?.from === 'deck' ? 'opacity-30' : ''}`}
          >
            <span className="text-8xl leading-none">{current.emoji}</span>
            <span className="mt-3 text-xl font-bold text-slate-500">{current.name}</span>
          </div>
        ) : r.done ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl font-black text-emerald-400">
              {r.total} / {r.total} ✓
            </div>
            {switchNext ? (
              <button
                type="button"
                onClick={() => setRound(start(r.deck, true, r.placed.flat().sort(() => Math.random() - 0.5)))}
                className="rounded-2xl bg-amber-500 px-6 py-4 text-2xl font-black"
              >
                Switch! {r.deck.then!.bins.map((b) => `${b.example} ${b.label}`).join(' · ')}
              </button>
            ) : (
              <button type="button" onClick={() => setRound(start(r.deck))} className="rounded-2xl bg-sky-500 px-6 py-4 text-2xl font-black">
                ↻ New cards
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {r.wrong && r.wrong.size > 0 && <div className="text-2xl font-black text-rose-400 tabular-nums">{r.wrong.size} to move</div>}
            <button type="button" onClick={check} className="rounded-full bg-emerald-500 w-28 h-28 text-6xl font-black shadow-xl" aria-label="Check">
              ✓
            </button>
          </div>
        )}
      </div>

      {/* The bins: name, picture, count, and the cards sorted into them (which can be dragged to another bin). */}
      <div className="grid gap-2 p-2 shrink-0" style={{ gridTemplateColumns: `repeat(${r.bins.length}, minmax(0, 1fr))`, height: '46%' }}>
        {r.bins.map((b, i) => (
          <div
            key={b.label}
            data-bin={i}
            onClick={() => current && !drag && place(current, 'deck', i)}
            className={`rounded-2xl border-4 flex flex-col p-2 min-w-0 transition-colors ${
              drag?.moved ? 'border-sky-400 bg-sky-400/10' : 'border-slate-600 bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-3xl leading-none">{b.example}</span>
              <span className="text-3xl font-black tabular-nums">{r.placed[i].length}</span>
            </div>
            <div className="text-xl font-black truncate">{b.label}</div>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-wrap content-start gap-1 mt-1">
              {r.placed[i].map((c) => {
                const wrong = r.wrong?.has(c.emoji)
                return (
                  <span
                    key={c.emoji}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      down(e, c, i)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`touch-none text-3xl leading-none p-1 rounded-xl ${wrong ? 'ring-4 ring-rose-500 bg-rose-500/20' : ''} ${drag?.card.emoji === c.emoji ? 'opacity-30' : ''}`}
                    style={wrong ? { animation: 'sort-wobble 0.5s ease-in-out 3' } : undefined}
                  >
                    {c.emoji}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* The card being dragged, under the finger. */}
      {drag?.moved && (
        <div className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl w-24 h-24 flex items-center justify-center" style={{ left: drag.x, top: drag.y }}>
          <span className="text-6xl leading-none">{drag.card.emoji}</span>
        </div>
      )}
    </div>
  )
}

/** Every deck its own button, showing its bins (no menus). */
function Picker({ onPick, onHome }: { onPick: (d: Deck) => void; onHome: () => void }) {
  return (
    <div className="h-dvh w-full overflow-y-auto bg-slate-900 text-white p-3">
      <div className="flex items-center gap-3 mb-3">
        <button type="button" onClick={onHome} className="w-12 h-12 rounded-full bg-white/10 text-2xl font-bold" aria-label="Home">
          ←
        </button>
        <h1 className="text-3xl font-black">Sort</h1>
      </div>
      {SECTIONS.map((s) => (
        <div key={s} className="mb-4">
          <h2 className="text-lg font-bold text-slate-400 mb-2">{s}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {DECKS.filter((d) => d.section === s).map((d) => (
              <button key={d.id} type="button" onClick={() => onPick(d)} className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-3 text-left active:bg-slate-700">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xl font-black">
                  {d.bins.map((b) => (
                    <span key={b.label} className="whitespace-nowrap">
                      <span className="text-2xl">{b.example}</span> {b.label}
                    </span>
                  ))}
                </div>
                {d.then && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-lg font-bold text-amber-400 mt-1">
                    <span>then</span>
                    {d.then.bins.map((b) => (
                      <span key={b.label} className="whitespace-nowrap">
                        {b.example} {b.label}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default App
