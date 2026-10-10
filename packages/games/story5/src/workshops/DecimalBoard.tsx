/**
 * The Decimal Board (Part 6's workshop). Explore: a free mat either side of
 * the point, in beads or in money, with the standard notation following the
 * objects. Mastery, on the drill engine's rules (a miss quietly comes back;
 * a clean run earns a star), both ways: symbols to objects (build 2.35, build
 * 3/10, make $1.27) and objects to symbols (write what's on the mat; write
 * 0.3 as a fraction). Comparing 0.5 and 0.45 means building both first; only
 * then is a sign picked, with the drill's lockout and reshuffle. The child
 * makes every exchange.
 */
import { useCallback, useRef, useState } from 'react'
import { record } from '../evidence'
import { TenBar, UnitBead } from '../kit/kit'
import { Bill, Coin, HundredthPiece, TenthPiece } from '../kit/part6'
import { SANS } from '../kit/sizes'
import { DECIMAL_LINES as L } from './decimalLines'
import { DecimalMat } from './decimalMat'
import { DEC_PLACE_COLOUR, PLACE_NAMES, ZERO, canonical, fmt, hundredths, type DecCounts, type Look } from './decimalLayout'
import { advanceQueue } from './queue'
import { cue, sfx } from './sound'
import { LOCKOUT_MS, type WorkshopProps } from './types'
import { CheckButton, Prompt, RunDone, WorkshopScreen, type Mode } from './ui'

/** The notation for what's on the mat: the number, digit by digit in its place's colour, when every place holds 0–9; otherwise the sum by place. */
function NotationPanel({ counts, look }: { counts: DecCounts; look: Look }) {
  const h = hundredths(counts)
  const money = look === 'money'
  const tidy = counts.every((c) => c <= 9)
  const terms = [3, 2, 1, 0].filter((p) => counts[p] > 0).map((p) => counts[p] * 10 ** p)
  const digits = [...fmt(h, money)]
  // Colour each digit by its place: count back from the point.
  const point = digits.indexOf('.')
  const placeOf = (i: number) => (point < 0 ? digits.length - 1 - i : i < point ? point - 1 - i : -(i - point)) + 2
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-3 text-2xl font-black tabular-nums">
        {[3, 2, 1, 0].map((p) => (
          <span key={p} style={{ color: DEC_PLACE_COLOUR[p] }}>
            {counts[p]}
            {p === 2 && <span className="text-slate-300"> .</span>}
          </span>
        ))}
      </div>
      {!tidy && (
        <div className="text-2xl font-black text-slate-200 text-center">
          {terms.map((t) => fmt(t, money)).join(' + ')} = {fmt(h, money)}
        </div>
      )}
      <div className="text-6xl font-black tabular-nums" style={{ fontFamily: SANS }}>
        {tidy
          ? digits.map((d, i) => (
              <span key={i} style={{ color: d === '.' || d === '$' || d === ',' ? '#fff' : DEC_PLACE_COLOUR[placeOf(i)] ?? '#fff' }}>
                {d}
              </span>
            ))
          : <span className="text-white">{fmt(h, money)}</span>}
      </div>
    </div>
  )
}

/** A small picture of one piece, for the tray's buttons. */
function TrayIcon({ look, place }: { look: Look; place: number }) {
  if (look === 'money')
    return place >= 2 ? (
      <svg viewBox="-4 -4 128 62" className="h-10 w-16">
        <Bill x={0} y={0} value={place === 3 ? 10 : 1} />
      </svg>
    ) : (
      <svg viewBox="-24 -24 48 48" className="h-10 w-10">
        <Coin x={0} y={0} kind={place === 1 ? 'dime' : 'penny'} />
      </svg>
    )
  return (
    <svg viewBox={place === 3 ? '-20 -10 60 260' : place === 2 ? '-4 -4 30 30' : place === 1 ? '-10 -4 28 30' : '-10 -10 28 28'} className="h-10 w-10">
      {place === 3 ? <TenBar x={0} y={0} /> : place === 2 ? <UnitBead x={0} y={0} /> : place === 1 ? <TenthPiece x={0} y={0} /> : <HundredthPiece x={0} y={0} />}
    </svg>
  )
}

/** The supply: one tap, one piece onto its column. */
function Tray({ counts, look, onChange }: { counts: DecCounts; look: Look; onChange: (c: DecCounts) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      {[3, 2, 1, 0].map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => {
            const c = [...counts] as DecCounts
            c[p] += 1
            onChange(c)
          }}
          className="rounded-xl bg-slate-800 border-2 border-slate-600 active:bg-slate-700 flex flex-col items-center p-1 min-h-16"
          aria-label={`Add one of the ${PLACE_NAMES[look][p]}`}
        >
          <TrayIcon look={look} place={p} />
          <span className="text-sm font-bold leading-tight" style={{ color: DEC_PLACE_COLOUR[p] }}>
            + {PLACE_NAMES[look][p]}
          </span>
        </button>
      ))}
    </div>
  )
}

/** Digit racks for writing a number: units . tenths hundredths (tap a digit to place it; tap again to take it off). */
function DigitComposer({ digits, onChange }: { digits: (number | null)[]; onChange: (d: (number | null)[]) => void }) {
  const PLACES = [2, 1, 0]
  return (
    <div className="flex flex-col gap-2 w-full items-center">
      <button type="button" onClick={() => onChange([null, null, null])} className="flex items-end gap-1 text-6xl font-black tabular-nums" aria-label="Clear">
        {PLACES.map((p, k) => (
          <span key={p} className="flex items-end">
            <span className="inline-block w-12 text-center border-b-4 border-slate-500" style={{ color: DEC_PLACE_COLOUR[p] }}>
              {digits[k] ?? ' '}
            </span>
            {p === 2 && <span className="text-white">.</span>}
          </span>
        ))}
      </button>
      {PLACES.map((p, k) => (
        <div key={p} className="flex flex-wrap gap-1 justify-center">
          {Array.from({ length: 10 }, (_, d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange(digits.map((v, j) => (j === k ? (v === d ? null : d) : v)))}
              className={`rounded-md w-8 py-0.5 text-base font-black tabular-nums border-2 ${digits[k] === d ? 'bg-amber-200 border-amber-400' : 'bg-[#fbf6ea] border-[#d8c8a6]'}`}
              style={{ color: DEC_PLACE_COLOUR[p], fontFamily: SANS }}
              aria-label={`${d} ${PLACE_NAMES.beads[p]}`}
            >
              {d}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

/** A fraction, written: the numerator from two digit racks, the denominator 10 or 100. */
function FractionComposer({ num, den, onChange }: { num: [number | null, number | null]; den: number | null; onChange: (num: [number | null, number | null], den: number | null) => void }) {
  const n = num[0] === null && num[1] === null ? null : (num[0] ?? 0) * 10 + (num[1] ?? 0)
  return (
    <div className="flex flex-col gap-2 w-full items-center">
      <button type="button" onClick={() => onChange([null, null], null)} className="flex flex-col items-center text-5xl font-black tabular-nums text-white" aria-label="Clear">
        <span className="min-w-24 text-center">{n ?? ' '}</span>
        <span className="w-28 border-t-4 border-white" />
        <span className="min-w-24 text-center">{den ?? ' '}</span>
      </button>
      {[0, 1].map((k) => (
        <div key={k} className="flex flex-wrap gap-1 justify-center">
          {Array.from({ length: 10 }, (_, d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange(num.map((v, j) => (j === k ? (v === d ? null : d) : v)) as [number | null, number | null], den)}
              className={`rounded-md w-8 py-0.5 text-base font-black tabular-nums border-2 text-slate-900 ${num[k] === d ? 'bg-amber-200 border-amber-400' : 'bg-[#fbf6ea] border-[#d8c8a6]'}`}
              aria-label={`${k === 0 ? 'tens' : 'ones'} digit ${d}`}
            >
              {k === 0 ? d * 10 : d}
            </button>
          ))}
        </div>
      ))}
      <div className="flex gap-2">
        {[10, 100].map((d) => (
          <button key={d} type="button" onClick={() => onChange(num, den === d ? null : d)} className={`rounded-lg px-4 py-1 text-xl font-black border-2 text-slate-900 ${den === d ? 'bg-amber-200 border-amber-400' : 'bg-[#fbf6ea] border-[#d8c8a6]'}`}>
            / {d}
          </button>
        ))}
      </div>
    </div>
  )
}

// ——— Mastery ———
type Challenge =
  | { id: string; kind: 'build'; h: number }
  | { id: string; kind: 'money'; h: number }
  | { id: string; kind: 'fromFrac'; num: number; den: 10 | 100 }
  | { id: string; kind: 'toFrac'; h: number }
  | { id: string; kind: 'read'; counts: DecCounts }
  | { id: string; kind: 'compare'; a: number; b: number }

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))

/** A run: Lan's four (2.35; 0.5 against 0.45; 3/10 both ways; money), then fresh ones of each kind. */
function newRun(): Challenge[] {
  // The trap: more digits, but less (0.6 against 0.58).
  const x = rand(2, 8)
  const trap: [number, number] = Math.random() < 0.5 ? [x * 10, (x - 1) * 10 + rand(1, 9)] : [(x - 1) * 10 + rand(1, 9), x * 10]
  const tenthsNum = rand(1, 9)
  const hundredthsNum = rand(11, 99)
  return [
    { id: 'build 2.35', kind: 'build', h: 235 },
    { id: 'compare 0.5 0.45', kind: 'compare', a: 50, b: 45 },
    { id: 'fromFrac 3/10', kind: 'fromFrac', num: 3, den: 10 },
    { id: 'toFrac 0.3', kind: 'toFrac', h: 30 },
    { id: 'read A', kind: 'read', counts: canonical(rand(1, 9) * 100 + rand(0, 9) * 10 + rand(1, 9)) },
    { id: 'money A', kind: 'money', h: rand(1, 3) * 100 + rand(0, 9) * 10 + rand(1, 9) },
    { id: 'compare B', kind: 'compare', a: trap[0], b: trap[1] },
    Math.random() < 0.5 ? { id: 'fromFrac B', kind: 'fromFrac', num: hundredthsNum, den: 100 } : { id: 'toFrac B', kind: 'toFrac', h: tenthsNum },
  ]
}

function prompt(c: Challenge, step: number) {
  switch (c.kind) {
    case 'build':
      return `Build ${fmt(c.h)}`
    case 'money':
      return `Make ${fmt(c.h, true)}`
    case 'fromFrac':
      return (
        <span>
          Build <Frac num={c.num} den={c.den} />
        </span>
      )
    case 'toFrac':
      return `Write ${fmt(c.h)} as a fraction`
    case 'read':
      return 'Write this number'
    case 'compare':
      return step === 0 ? `Build ${fmt(c.a)}` : step === 1 ? `Now build ${fmt(c.b)}` : `${fmt(c.a)}  ?  ${fmt(c.b)}`
  }
}

function spoken(c: Challenge, step: number) {
  switch (c.kind) {
    case 'build':
      return L.build
    case 'money':
      return L.money
    case 'fromFrac':
      return L.fromFrac
    case 'toFrac':
      return L.toFrac
    case 'read':
      return L.read
    case 'compare':
      return step === 0 ? L.first : step === 1 ? L.second : L.compare
  }
}

/** A fraction in standard notation, stacked. */
function Frac({ num, den }: { num: number; den: number }) {
  return (
    <span className="inline-flex flex-col items-center align-middle leading-none mx-1 text-[0.8em]">
      <span>{num}</span>
      <span className="w-full border-t-[3px] border-current my-0.5" />
      <span>{den}</span>
    </span>
  )
}

export function DecimalBoard({ services, onBack, onStar }: WorkshopProps) {
  const [mode, setMode] = useState<Mode>('explore')
  const [look, setLook] = useState<Look>('beads')
  const [counts, setCounts] = useState<DecCounts>(ZERO)

  // Mastery state.
  const [queue, setQueue] = useState<Challenge[]>(newRun)
  const [missed, setMissed] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [step, setStep] = useState(0)
  const [first, setFirst] = useState<DecCounts | null>(null)
  const [second, setSecond] = useState<DecCounts | null>(null)
  const [digits, setDigits] = useState<(number | null)[]>([null, null, null])
  const [num, setNum] = useState<[number | null, number | null]>([null, null])
  const [den, setDen] = useState<number | null>(null)
  const [signs, setSigns] = useState<('<' | '>')[]>(['<', '>'])
  const [locked, setLocked] = useState(false)
  const [shake, setShake] = useState(0)
  const [shown, setShown] = useState<string | null>(null)
  const [runDone, setRunDone] = useState<null | boolean>(null)
  const lockTimer = useRef(0)

  const onChange = useCallback((c: DecCounts) => setCounts(c), [])
  const current = queue[0]

  const clear = () => {
    setCounts(ZERO)
    setDigits([null, null, null])
    setNum([null, null])
    setDen(null)
  }

  const finish = (right: boolean) => {
    const c = current
    record(services.shared, { stream: 'workshop', part: 6, item: c.id, correct: right && !dirty, skill: c.kind })
    if (!right) return
    sfx('correct')
    const next = advanceQueue(queue, dirty)
    const nextMissed = dirty && !missed.includes(c.id) ? [...missed, c.id] : missed
    setMissed(nextMissed)
    setDirty(false)
    setStep(0)
    setFirst(null)
    setSecond(null)
    setShown(null)
    clear()
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
    record(services.shared, { stream: 'workshop', part: 6, item: current.id, correct: false, skill: current.kind })
  }

  const check = () => {
    const c = current
    const h = hundredths(counts)
    switch (c.kind) {
      case 'build':
      case 'money':
        return h === c.h ? finish(true) : miss()
      case 'fromFrac':
        return h * c.den === c.num * 100 ? finish(true) : miss()
      case 'toFrac': {
        const n = num[0] === null && num[1] === null ? null : (num[0] ?? 0) * 10 + (num[1] ?? 0)
        // Any equal fraction counts: 3/10 or 30/100.
        return n !== null && den !== null && n * 100 === c.h * den ? finish(true) : miss()
      }
      case 'read': {
        if (digits.some((d) => d === null)) return miss()
        const [u, t, hh] = digits as number[]
        return u * 100 + t * 10 + hh === hundredths(c.counts) ? finish(true) : miss()
      }
      case 'compare': {
        const want = step === 0 ? c.a : c.b
        if (h !== want) return miss()
        sfx('correct')
        if (step === 0) setFirst(counts)
        else setSecond(counts)
        setCounts(ZERO)
        setStep(step + 1)
        return
      }
    }
  }
  const pick = (s: '<' | '>') => {
    if (current.kind !== 'compare' || locked) return
    const right = current.a < current.b ? '<' : '>'
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
    clear()
  }

  // Each mode starts on a clear mat (Explore's sandbox mustn't leak into a challenge).
  const screen = (body: React.ReactNode) => (
    <WorkshopScreen
      title="Decimal Board"
      mode={mode}
      onMode={(m) => {
        setMode(m)
        clear()
      }}
      onBack={onBack}
    >
      {body}
    </WorkshopScreen>
  )

  if (mode === 'explore')
    return screen(
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">
        <DecimalMat counts={counts} look={look} onChange={onChange} onExchange={cue} className="flex-1 min-h-0 w-full rounded-2xl" />
        <div className="landscape:w-80 flex flex-col gap-3 items-center justify-center shrink-0">
          <NotationPanel counts={counts} look={look} />
          <Tray counts={counts} look={look} onChange={setCounts} />
          <div className="flex gap-4 items-center">
            <button
              type="button"
              onClick={() => {
                setLook(look === 'beads' ? 'money' : 'beads')
                setCounts(ZERO)
              }}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-black"
            >
              {look === 'beads' ? '$ money' : '● beads'}
            </button>
            <button type="button" onClick={() => setCounts(ZERO)} className="text-sm font-bold text-slate-400 underline">
              clear the mat
            </button>
          </div>
        </div>
      </div>,
    )

  // ——— Mastery ———
  if (runDone !== null || !current) return screen(<RunDone star={!!runDone} missed={missed.length} onAgain={restart} />)

  const c = current
  const cLook: Look = c.kind === 'money' ? 'money' : 'beads'
  return screen(
    <>
      <Prompt text={prompt(c, step)} line={spoken(c, step)} shake={shake} left={queue.length} sayKey={`${c.id}|${step}`} />
      {c.kind === 'compare' && step === 2 && first && second ? (
        <div className="flex-1 min-h-0 flex flex-col landscape:flex-row items-center gap-3">
          <DecimalMat counts={first} look="beads" className="flex-1 min-h-0 w-full rounded-2xl" />
          <div className="flex landscape:flex-col gap-3 items-center">
            <div className="w-24 h-24 rounded-2xl border-4 border-dashed border-slate-500 flex items-center justify-center text-6xl font-black">{shown}</div>
            {signs.map((s) => (
              <button key={s} type="button" disabled={locked || !!shown} onClick={() => pick(s)} className="w-20 h-20 rounded-2xl bg-white/10 text-5xl font-black disabled:opacity-30">
                {s}
              </button>
            ))}
          </div>
          <DecimalMat counts={second} look="beads" className="flex-1 min-h-0 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">
          {c.kind === 'toFrac' ? (
            // Symbols to symbols: the decimal, large, where the mat would be.
            <div className="flex-1 min-h-0 w-full rounded-2xl bg-[#efe6d4] flex items-center justify-center text-8xl font-black tabular-nums" style={{ color: '#3b2f25', fontFamily: SANS }}>
              {fmt(c.h)}
            </div>
          ) : (
            <DecimalMat
              counts={c.kind === 'read' ? c.counts : counts}
              look={cLook}
              onChange={c.kind === 'read' ? undefined : onChange}
              onExchange={cue}
              className="flex-1 min-h-0 w-full rounded-2xl"
            />
          )}
          <div className="landscape:w-80 flex flex-col gap-3 items-center justify-center shrink-0">
            {c.kind === 'read' ? (
              <DigitComposer digits={digits} onChange={setDigits} />
            ) : c.kind === 'toFrac' ? (
              <FractionComposer
                num={num}
                den={den}
                onChange={(n, d) => {
                  setNum(n)
                  setDen(d)
                }}
              />
            ) : (
              <>
                <Tray counts={counts} look={cLook} onChange={setCounts} />
                <button type="button" onClick={() => setCounts(ZERO)} className="text-sm font-bold text-slate-400 underline">
                  clear the mat
                </button>
              </>
            )}
            <CheckButton onClick={check} />
          </div>
        </div>
      )}
    </>,
  )
}
