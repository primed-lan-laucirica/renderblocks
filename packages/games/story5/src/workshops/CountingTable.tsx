/**
 * The Counting Table (Part 1's workshop): pebbles, rods and the track.
 * Explore: a free table for each; the numeral beside it always follows the
 * objects. Mastery: make a pile the same as a flock (no numbers anywhere);
 * put out a number of pebbles; lay rods on the track to make a number; name
 * a flashed dot pattern; move the pebble one more or one less on the track.
 * The drill's rules: a miss quietly comes back until the run is clean, and a
 * clean run earns the star. Answers are built; only naming the pattern is a
 * choice, and it has the drill's lockout and reshuffle.
 */
import { useState } from 'react'
import type { Pt } from '../engine/ease'
import { record } from '../evidence'
import { FlashCard, PebbleTable, RodRack, RodTrack, TokenTrack } from './countingPieces'
import { RIGHT, WHOLE, flock, freeSpot, rodSum, shuffled } from './countingLayout'
import { COUNTING_LINES } from './countingLines'
import { advanceQueue } from './queue'
import { cue, sfx } from './sound'
import { LOCKOUT_MS, type WorkshopProps } from './types'
import { CheckButton, Prompt, RunDone, WorkshopScreen, type Mode } from './ui'

type Tool = 'pebbles' | 'rods' | 'track'
type Challenge =
  | { id: string; kind: 'match'; n: number; sheep: Pt[] }
  | { id: string; kind: 'build'; n: number }
  | { id: string; kind: 'rods'; n: number }
  | { id: string; kind: 'flash'; n: number }
  | { id: string; kind: 'more' | 'less'; from: number }

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))

/** A run: match, build, flash, one more; rods, flash, one less, match. */
function newRun(): Challenge[] {
  const m1 = rand(4, 8)
  let m2 = rand(3, 8)
  while (m2 === m1) m2 = rand(3, 8)
  const f1 = rand(1, 6)
  let f2 = rand(2, 6)
  while (f2 === f1) f2 = rand(2, 6)
  const b = rand(5, 9)
  const r = rand(6, 10)
  const up = rand(1, 8)
  const dn = rand(2, 9)
  const seed = rand(1, 1e6)
  return [
    { id: `match ${m1}`, kind: 'match', n: m1, sheep: flock(m1, seed) },
    { id: `build ${b}`, kind: 'build', n: b },
    { id: `flash ${f1}`, kind: 'flash', n: f1 },
    { id: `more ${up}`, kind: 'more', from: up },
    { id: `rods ${r}`, kind: 'rods', n: r },
    { id: `flash ${f2}`, kind: 'flash', n: f2 },
    { id: `less ${dn}`, kind: 'less', from: dn },
    { id: `match ${m2}`, kind: 'match', n: m2, sheep: flock(m2, seed + 1) },
  ]
}

function prompt(c: Challenge) {
  switch (c.kind) {
    case 'match':
      return 'The same as the sheep'
    case 'build':
      return `Put out ${c.n}`
    case 'rods':
      return `Make ${c.n} with rods`
    case 'flash':
      return 'How many?'
    case 'more':
      return `One more than ${c.from}`
    case 'less':
      return `One less than ${c.from}`
  }
}

/** Add a pebble to a table (a free spot, seeded by how many there are, so it's steady). */
const addPebble = (ps: Pt[], region = WHOLE) => [...ps, freeSpot(ps, region, 101 + ps.length * 7)]

/** The pebble tray: one tap, one pebble. */
function AddPebble({ onAdd }: { onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd} className="rounded-xl bg-slate-800 border-2 border-slate-600 active:bg-slate-700 px-5 py-3 flex items-center gap-3" aria-label="Add a pebble">
      <svg viewBox="-30 -30 60 60" className="w-10 h-10">
        <ellipse cx={0} cy={0} rx={24} ry={18} fill="#c8643b" />
      </svg>
      <span className="text-xl font-black text-amber-200">+ pebble</span>
    </button>
  )
}

export function CountingTable({ services, onBack, onStar }: WorkshopProps) {
  const [mode, setMode] = useState<Mode>('explore')
  const [tool, setTool] = useState<Tool>('pebbles')
  // The things on the table.
  const [pebbles, setPebbles] = useState<Pt[]>([])
  const [rods, setRods] = useState<number[]>([])
  const [token, setToken] = useState(0)

  // Mastery.
  const [queue, setQueue] = useState<Challenge[]>(newRun)
  const [missed, setMissed] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [shake, setShake] = useState(0)
  const [runDone, setRunDone] = useState<null | boolean>(null)
  // Naming a flashed pattern: the numerals' order, the lockout, and which flash this is.
  const [digits, setDigits] = useState<number[]>(() => shuffled([1, 2, 3, 4, 5, 6]))
  const [locked, setLocked] = useState(false)
  const [flash, setFlash] = useState(0)
  const [shown, setShown] = useState<number | null>(null)

  const current = queue[0]

  /** A clear table, ready for challenge `c` (the token waits on its starting number). */
  const ready = (c: Challenge | undefined) => {
    setPebbles([])
    setRods([])
    setToken(c && (c.kind === 'more' || c.kind === 'less') ? c.from : 0)
    setShown(null)
    setDigits(shuffled([1, 2, 3, 4, 5, 6]))
  }

  const finish = (right: boolean) => {
    const c = current
    record(services.shared, { stream: 'workshop', part: 1, item: c.id, correct: right && !dirty, skill: c.kind })
    if (!right) return
    sfx('correct')
    const next = advanceQueue(queue, dirty)
    const nextMissed = dirty && !missed.includes(c.id) ? [...missed, c.id] : missed
    setMissed(nextMissed)
    setDirty(false)
    ready(next[0])
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
    record(services.shared, { stream: 'workshop', part: 1, item: current.id, correct: false, skill: current.kind })
  }

  const check = () => {
    const c = current
    switch (c.kind) {
      case 'match':
      case 'build':
        return pebbles.length === c.n ? finish(true) : miss()
      case 'rods':
        return rods.reduce((s, n) => s + n, 0) === c.n && rods.length > 0 ? finish(true) : miss()
      case 'more':
        return token === c.from + 1 ? finish(true) : miss()
      case 'less':
        return token === c.from - 1 ? finish(true) : miss()
    }
  }
  const pick = (d: number) => {
    if (current.kind !== 'flash' || locked || shown !== null) return
    if (d === current.n) {
      setShown(d)
      window.setTimeout(() => finish(true), 700)
      return
    }
    miss()
    // The drill's lockout: the numerals go dead for a moment, come back reshuffled, and the pattern shows again.
    setLocked(true)
    window.setTimeout(() => {
      setDigits((old) => shuffled(old))
      setLocked(false)
      setFlash((f) => f + 1)
    }, LOCKOUT_MS)
  }

  const restart = () => {
    const run = newRun()
    setQueue(run)
    setMissed([])
    setRunDone(null)
    setDirty(false)
    ready(run[0])
  }

  const screen = (body: React.ReactNode) => (
    <WorkshopScreen
      title="Counting Table"
      mode={mode}
      onMode={(m) => {
        // Each mode starts on a clear table.
        setMode(m)
        ready(m === 'mastery' ? current : undefined)
      }}
      onBack={onBack}
    >
      {body}
    </WorkshopScreen>
  )

  const placeRod = (n: number) => {
    if (rods.reduce((s, r) => s + r, 0) + n > 10) return
    cue('slide', n)
    setRods([...rods, n])
  }
  const room = 10 - rods.reduce((s, n) => s + n, 0)
  const rodSide = <RodRack room={room} onPick={placeRod} />
  const area = 'flex-1 min-h-0 flex flex-col landscape:flex-row gap-3'
  const side = 'landscape:w-80 flex flex-col gap-3 items-center justify-center shrink-0'

  // ——— Explore ———
  if (mode === 'explore') {
    const numeral = tool === 'pebbles' ? String(pebbles.length) : tool === 'rods' ? rodSum(rods) : String(token)
    return screen(
      <>
        <div className="flex gap-2 justify-center">
          {(['pebbles', 'rods', 'track'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setTool(k)} className={`rounded-lg px-4 py-1.5 font-black ${tool === k ? 'bg-amber-200 text-slate-900' : 'bg-white/10'}`}>
              {k === 'pebbles' ? 'Pebbles' : k === 'rods' ? 'Rods' : 'Track'}
            </button>
          ))}
        </div>
        <div className={area}>
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            {tool === 'pebbles' && <PebbleTable pebbles={pebbles} onChange={setPebbles} className="w-full h-full max-h-full rounded-2xl" />}
            {tool === 'rods' && <RodTrack rods={rods} onRemove={(i) => setRods(rods.filter((_, j) => j !== i))} className="w-full max-h-full rounded-2xl" />}
            {tool === 'track' && (
              <TokenTrack
                value={token}
                onChange={(v) => {
                  cue('pebble', v)
                  setToken(v)
                }}
                className="w-full max-h-full rounded-2xl"
              />
            )}
          </div>
          <div className={side}>
            {/* The numeral follows the objects. */}
            <div className={`${tool === 'rods' ? 'text-5xl' : 'text-8xl'} font-black text-white tabular-nums text-center`}>{numeral}</div>
            {tool === 'pebbles' && (
              <>
                <AddPebble
                  onAdd={() => {
                    cue('pebble', pebbles.length)
                    setPebbles(addPebble(pebbles))
                  }}
                />
                <div className="text-sm text-slate-400 text-center">Drag a pebble off the table to put it back.</div>
              </>
            )}
            {tool === 'rods' && rodSide}
            <button type="button" onClick={() => ready(undefined)} className="text-sm font-bold text-slate-400 underline">
              clear the table
            </button>
          </div>
        </div>
      </>,
    )
  }

  // ——— Mastery ———
  if (runDone !== null || !current) return screen(<RunDone star={!!runDone} missed={missed.length} onAgain={restart} />)

  const c = current
  const line = COUNTING_LINES[c.kind]
  return screen(
    <>
      <Prompt text={prompt(c)} line={line} shake={shake} left={queue.length} sayKey={`${c.id}|${queue.length}`} />
      <div className={area}>
        <div className="flex-1 min-h-0 w-full flex items-center justify-center">
          {(c.kind === 'match' || c.kind === 'build') && (
            <PebbleTable pebbles={pebbles} onChange={setPebbles} sheep={c.kind === 'match' ? c.sheep : undefined} divider={c.kind === 'match' ? 410 : undefined} className="w-full h-full max-h-full rounded-2xl" />
          )}
          {c.kind === 'rods' && <RodTrack rods={rods} onRemove={(i) => setRods(rods.filter((_, j) => j !== i))} className="w-full max-h-full rounded-2xl" />}
          {(c.kind === 'more' || c.kind === 'less') && (
            <TokenTrack
              value={token}
              onChange={(v) => {
                cue('pebble', v)
                setToken(v)
              }}
              className="w-full max-h-full rounded-2xl"
            />
          )}
          {c.kind === 'flash' && <FlashCard key={`${c.id}|${queue.length}|${flash}`} n={c.n} onAgain={() => setFlash((f) => f + 1)} className="h-full max-h-80 w-auto max-w-full" />}
        </div>
        <div className={side}>
          {(c.kind === 'match' || c.kind === 'build') && (
            <AddPebble
              onAdd={() => {
                cue('pebble', pebbles.length)
                setPebbles(addPebble(pebbles, c.kind === 'match' ? RIGHT : WHOLE))
              }}
            />
          )}
          {c.kind === 'rods' && rodSide}
          {c.kind === 'flash' ? (
            <div className="grid grid-cols-3 gap-2">
              {digits.map((d) => (
                <button key={d} type="button" disabled={locked || shown !== null} onClick={() => pick(d)} className={`w-20 h-20 rounded-2xl text-5xl font-black disabled:opacity-30 ${shown === d ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  {d}
                </button>
              ))}
            </div>
          ) : (
            <CheckButton onClick={check} />
          )}
        </div>
      </div>
    </>,
  )
}
