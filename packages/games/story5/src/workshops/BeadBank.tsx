/**
 * The Bead Bank (Part 2's workshop). Explore: a free mat with a supply
 * tray; the standard notation beside it always follows the objects. Mastery:
 * challenges both ways (symbols → build it in beads; beads → compose it in
 * numeral cards), on the drill engine's rules: a missed challenge quietly
 * comes back until it's answered right first time; a clean run earns a star.
 * Answers are built, never picked, except < / >, where a wrong pick locks
 * the signs for a moment and reshuffles them.
 */
import { useCallback, useRef, useState } from 'react'
import { record } from '../evidence'
import { NumeralCard } from '../kit/kit'
import { PLACE_COLOUR, SANS } from '../kit/sizes'
import { Mat, Piece } from './Mat'
import { CUBE, CUBE_D, PLACE_NAMES, value, type Counts } from './matLayout'
import { LINES } from './lines'
import { advanceQueue } from './queue'
import { cue, sfx } from './sound'
import { LOCKOUT_MS, type WorkshopProps } from './types'
import { CheckButton, Prompt, RunDone, WorkshopScreen, type Mode } from './ui'

const ZERO: Counts = [0, 0, 0, 0]
const fmt = (n: number) => n.toLocaleString('en-US')
/** The standard notation for what's on the mat: nested numeral cards when every place holds 0–9; otherwise the sum by place. */
function NotationPanel({ counts }: { counts: Counts }) {
  const v = value(counts)
  const tidy = counts.every((c) => c <= 9)
  const terms = [3, 2, 1, 0].filter((p) => counts[p] > 0).map((p) => counts[p] * 10 ** p)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-3 text-2xl font-black tabular-nums">
        {[3, 2, 1, 0].map((p) => (
          <span key={p} style={{ color: PLACE_COLOUR[p] }}>
            {counts[p]}
          </span>
        ))}
      </div>
      {tidy ? (
        <svg viewBox="-20 -10 340 130" className="w-64 max-w-full">
          {[3, 2, 1, 0]
            .filter((p) => counts[p] > 0)
            .map((p) => (
              <NumeralCard key={p} value={counts[p] * 10 ** p} right={310} y={0} />
            ))}
          {v === 0 && <NumeralCard value={0} right={310} y={0} />}
        </svg>
      ) : (
        <div className="text-2xl font-black text-slate-200 text-center">
          {terms.map((n) => fmt(n)).join(' + ')} = {fmt(v)}
        </div>
      )}
      <div className="text-5xl font-black text-white tabular-nums">{fmt(v)}</div>
    </div>
  )
}

/** The supply: one tap, one piece onto its column. */
function Tray({ counts, onChange }: { counts: Counts; onChange: (c: Counts) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      {[3, 2, 1, 0].map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => {
            const c = [...counts] as Counts
            c[p] += 1
            onChange(c)
          }}
          className="rounded-xl bg-slate-800 border-2 border-slate-600 active:bg-slate-700 flex flex-col items-center p-1"
          aria-label={`Add one of the ${PLACE_NAMES[p]}`}
        >
          <svg viewBox={p === 3 ? `-4 ${-CUBE_D - 4} ${CUBE + 8} ${CUBE + 8}` : p === 2 ? '-10 -10 260 260' : p === 1 ? '-20 -10 60 260' : '-4 -4 30 30'} className="h-12 w-12">
            <Piece place={p} at={{ x: 0, y: 0 }} />
          </svg>
          <span className="text-sm font-bold" style={{ color: PLACE_COLOUR[p] }}>
            + {PLACE_NAMES[p]}
          </span>
        </button>
      ))}
    </div>
  )
}

// ——— Mastery ———
type Challenge =
  | { id: string; kind: 'build'; n: number }
  | { id: string; kind: 'read'; counts: Counts }
  | { id: string; kind: 'twoWays'; n: number }
  | { id: string; kind: 'compare'; a: Counts; b: Counts }

const canonical = (n: number): Counts => [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10, Math.floor(n / 1000) % 10]
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))

/** A run: build 1,345; read a layout; 23 two ways; compare; then a fresh build, read and compare (zeros in places). */
function newRun(): Challenge[] {
  const withZero = () => {
    const c = canonical(rand(101, 9909))
    c[rand(0, 2)] = 0
    return value(c) || 506
  }
  const pair = (): [number, number] => {
    // The same leading digit, so the next place decides.
    const h = rand(1, 9)
    const x = h * 100 + rand(0, 99)
    let y = h * 100 + rand(0, 99)
    while (y === x) y = h * 100 + rand(0, 99)
    return [x, y]
  }
  const [a1, b1] = pair()
  const [a2, b2] = pair()
  return [
    { id: 'build 1345', kind: 'build', n: 1345 },
    { id: 'read A', kind: 'read', counts: canonical(rand(21, 999)) },
    { id: 'two ways 23', kind: 'twoWays', n: 23 },
    { id: 'compare A', kind: 'compare', a: canonical(a1), b: canonical(b1) },
    { id: 'build B', kind: 'build', n: withZero() },
    { id: 'read B', kind: 'read', counts: canonical(withZero()) },
    { id: 'compare B', kind: 'compare', a: canonical(a2 * 10 + rand(0, 9)), b: canonical(b2 * 10 + rand(0, 9)) },
    { id: 'build C', kind: 'build', n: rand(11, 99) },
  ]
}

function prompt(c: Challenge, step: number) {
  switch (c.kind) {
    case 'build':
      return `Build ${fmt(c.n)}`
    case 'read':
      return 'Make this number with cards'
    case 'twoWays':
      return step === 0 ? `Build ${c.n}` : `Build ${c.n} another way`
    case 'compare':
      return 'Which sign?'
  }
}

/** The prompt, spoken (the numeral is left for him to read). */
function spoken(c: Challenge, step: number) {
  switch (c.kind) {
    case 'build':
      return LINES.build
    case 'read':
      return LINES.read
    case 'twoWays':
      return step === 0 ? LINES.build : LINES.anotherWay
    case 'compare':
      return LINES.compare
  }
}

/** Card racks: tap a card to nest it; tap the nest to take a card back off. */
function Composer({ cards, onChange }: { cards: Counts; onChange: (c: Counts) => void }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <button type="button" onClick={() => onChange(ZERO)} className="self-center" aria-label="Clear the cards">
        <svg viewBox="-20 -10 340 130" className="w-72 max-w-full">
          {[3, 2, 1, 0]
            .filter((p) => cards[p] > 0)
            .map((p) => (
              <NumeralCard key={p} value={cards[p] * 10 ** p} right={310} y={0} />
            ))}
          {value(cards) === 0 && <rect x={-10} y={0} width={320} height={100} rx={8} fill="none" stroke="#64748b" strokeWidth={3} strokeDasharray="10 8" />}
        </svg>
      </button>
      {[3, 2, 1, 0].map((p) => (
        <div key={p} className="flex flex-wrap gap-1 justify-center">
          {Array.from({ length: 9 }, (_, d) => d + 1).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                const c = [...cards] as Counts
                c[p] = c[p] === d ? 0 : d
                onChange(c)
              }}
              className={`rounded-md px-1.5 py-0.5 text-sm font-black tabular-nums border-2 ${cards[p] === d ? 'bg-amber-200 border-amber-400' : 'bg-[#fbf6ea] border-[#d8c8a6]'}`}
              style={{ color: PLACE_COLOUR[p], fontFamily: SANS }}
            >
              {d * 10 ** p}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

export function BeadBank({ services, onBack, onStar }: WorkshopProps) {
  const [mode, setMode] = useState<Mode>('explore')
  const [counts, setCounts] = useState<Counts>(ZERO)

  // Mastery state.
  const [queue, setQueue] = useState<Challenge[]>(newRun)
  const [missed, setMissed] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [step, setStep] = useState(0)
  const [firstWay, setFirstWay] = useState<Counts | null>(null)
  const [cards, setCards] = useState<Counts>(ZERO)
  const [signs, setSigns] = useState<('<' | '>')[]>(['<', '>'])
  const [locked, setLocked] = useState(false)
  const [shake, setShake] = useState(0)
  const [shown, setShown] = useState<string | null>(null)
  const [runDone, setRunDone] = useState<null | boolean>(null)
  const lockTimer = useRef(0)

  const onChange = useCallback((c: Counts) => setCounts(c), [])
  const current = queue[0]


  const finish = (right: boolean) => {
    const c = current
    record(services.shared, { stream: 'workshop', part: 2, item: c.id, correct: right && !dirty, skill: c.kind })
    if (!right) return
    sfx('correct')
    const wasDirty = dirty
    const next = advanceQueue(queue, wasDirty)
    const nextMissed = wasDirty && !missed.includes(c.id) ? [...missed, c.id] : missed
    setMissed(nextMissed)
    setDirty(false)
    setStep(0)
    setFirstWay(null)
    setCards(ZERO)
    setCounts(ZERO)
    setShown(null)
    if (next.length === 0) {
      const star = nextMissed.length === 0
      setRunDone(star)
      if (star) {
        sfx('celebrate')
        onStar()
      }
    }
    setQueue(next)
  }
  const miss = () => {
    sfx('wrong')
    setDirty(true)
    setShake((s) => s + 1)
    record(services.shared, { stream: 'workshop', part: 2, item: current.id, correct: false, skill: current.kind })
  }

  const check = () => {
    const c = current
    if (c.kind === 'build') return value(counts) === c.n ? finish(true) : miss()
    if (c.kind === 'read') return value(cards) === value(c.counts) ? finish(true) : miss()
    if (c.kind === 'twoWays') {
      if (value(counts) !== c.n) return miss()
      if (step === 0) {
        sfx('correct')
        setFirstWay(counts)
        setStep(1)
        return
      }
      // The same value, a different set of pieces.
      if (firstWay && firstWay.every((n, i) => n === counts[i])) return miss()
      return finish(true)
    }
  }
  const pick = (s: '<' | '>') => {
    if (current.kind !== 'compare' || locked) return
    const right = value(current.a) < value(current.b) ? '<' : '>'
    if (s === right) {
      setShown(s)
      setTimeout(() => finish(true), 700)
      return
    }
    miss()
    // The drill's lockout: the signs go dead for a moment, then come back reshuffled.
    setLocked(true)
    window.clearTimeout(lockTimer.current)
    lockTimer.current = window.setTimeout(() => {
      setSigns(Math.random() < 0.5 ? ['<', '>'] : ['>', '<'])
      setLocked(false)
    }, LOCKOUT_MS)
  }

  const restart = () => {
    setQueue(newRun())
    setMissed([])
    setRunDone(null)
    setCounts(ZERO)
  }

  // Each mode starts on a clear mat (Explore's sandbox mustn't leak into a challenge).
  const screen = (body: React.ReactNode) => (
    <WorkshopScreen
      title="Bead Bank"
      mode={mode}
      onMode={(m) => {
        setMode(m)
        setCounts(ZERO)
      }}
      onBack={onBack}
    >
      {body}
    </WorkshopScreen>
  )

  if (mode === 'explore')
    return screen(
        <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">
          <Mat counts={counts} onChange={onChange} onExchange={cue} className="flex-1 min-h-0 w-full rounded-2xl" />
          <div className="landscape:w-80 flex flex-col gap-3 items-center justify-center shrink-0">
            <NotationPanel counts={counts} />
            <Tray counts={counts} onChange={setCounts} />
            <button type="button" onClick={() => setCounts(ZERO)} className="text-sm font-bold text-slate-400 underline">
              clear the mat
            </button>
          </div>
        </div>,
    )

  // ——— Mastery ———
  if (runDone !== null || !current) return screen(<RunDone star={!!runDone} missed={missed.length} onAgain={restart} />)

  const c = current
  return screen(
    <>
      <Prompt text={prompt(c, step)} line={spoken(c, step)} shake={shake} left={queue.length} sayKey={`${c.id}|${step}`} />
      {c.kind === 'compare' ? (
        <div className="flex-1 min-h-0 flex flex-col landscape:flex-row items-center gap-3">
          <Mat counts={c.a} className="flex-1 min-h-0 w-full rounded-2xl" />
          <div className="flex landscape:flex-col gap-3 items-center">
            <div className="w-24 h-24 rounded-2xl border-4 border-dashed border-slate-500 flex items-center justify-center text-6xl font-black">{shown}</div>
            {signs.map((s) => (
              <button key={s} type="button" disabled={locked || !!shown} onClick={() => pick(s)} className="w-20 h-20 rounded-2xl bg-white/10 text-5xl font-black disabled:opacity-30">
                {s}
              </button>
            ))}
          </div>
          <Mat counts={c.b} className="flex-1 min-h-0 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">
          <Mat counts={c.kind === 'read' ? c.counts : counts} onChange={c.kind === 'read' ? undefined : onChange} onExchange={cue} className="flex-1 min-h-0 w-full rounded-2xl" />
          <div className="landscape:w-80 flex flex-col gap-3 items-center justify-center shrink-0">
            {c.kind === 'read' ? <Composer cards={cards} onChange={setCards} /> : <Tray counts={counts} onChange={setCounts} />}
            {c.kind !== 'read' && (
              <button type="button" onClick={() => setCounts(ZERO)} className="text-sm font-bold text-slate-400 underline">
                clear the mat
              </button>
            )}
            <CheckButton onClick={check} />
          </div>
        </div>
      )}
    </>,
  )
}

