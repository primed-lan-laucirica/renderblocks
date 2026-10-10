/**
 * The Stamp Game (Part 3's workshop). Explore: a tile mat with a supply
 * tray; tiles can be added, exchanged and taken away, and the notation
 * beside them always follows the tiles. Mastery, on the drill engine's
 * rules (a miss quietly comes back; a clean run earns a star):
 *   - add: both numbers' tiles are on the mat together; the child makes
 *     every exchange (ten ones → a ten, ten tens → a hundred), then writes
 *     the answer in numeral cards;
 *   - take away: the first number is on the mat; the child takes the second
 *     away, breaking a ten (or a hundred) themselves when a place runs short,
 *     then writes what's left in cards;
 *   - balance: 3 + ? = 7; the child puts tiles in the pan. The beam is held
 *     level until they check, so the answer is theirs, not the beam's.
 * Nothing is ever carried or borrowed for them.
 */
import { useCallback, useState } from 'react'
import { record } from '../evidence'
import { advanceQueue } from './queue'
import { cue, sfx } from './sound'
import { STAMP_LINES } from './stampLines'
import { NONE, tilesOf, tilesValue, type Tiles } from './stampLayout'
import { TileMat } from './stampMat'
import { BalancePuzzle, CardComposer, TileButton, TileNotation, TileTray } from './stampParts'
import type { WorkshopProps } from './types'
import { CheckButton, Prompt, RunDone, WorkshopScreen, type Mode } from './ui'

type Challenge =
  | { id: string; kind: 'add'; a: number; b: number }
  | { id: string; kind: 'sub'; a: number; b: number }
  /** a + b = c with one of a, b missing (null); `unit` is the tile used (1s or 10s). */
  | { id: string; kind: 'balance'; a: number | null; b: number | null; c: number; unit: 1 | 10 }

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const MAX_IN_PAN = 10

/** A run: every add needs an exchange, every take-away needs a break. */
function newRun(): Challenge[] {
  // Two-digit add with a ten to make from the ones.
  const add2 = () => {
    const oa = rand(4, 9)
    const ob = rand(10 - oa, 9)
    const ta = rand(1, 5)
    const tb = rand(1, 8 - ta)
    return { a: ta * 10 + oa, b: tb * 10 + ob }
  }
  // Three-digit add with an exchange in the ones and in the tens.
  const add3 = () => {
    const oa = rand(3, 9)
    const ob = rand(10 - oa, 9)
    const ta = rand(2, 9)
    const tb = rand(Math.max(0, 9 - ta), 9)
    const ha = rand(1, 4)
    const hb = rand(1, 7 - ha)
    return { a: ha * 100 + ta * 10 + oa, b: hb * 100 + tb * 10 + ob }
  }
  // Take-aways where the ones run short.
  const sub2 = () => {
    const ta = rand(3, 9)
    const oa = rand(0, 6)
    const tb = rand(1, ta - 1)
    const ob = rand(oa + 1, 9)
    return { a: ta * 10 + oa, b: tb * 10 + ob }
  }
  const sub3 = () => {
    const ha = rand(2, 9)
    const ta = rand(1, 9)
    const oa = rand(0, 6)
    const hb = rand(1, ha - 1)
    const tb = rand(0, ta - 1)
    const ob = rand(oa + 1, 9)
    return { a: ha * 100 + ta * 10 + oa, b: hb * 100 + tb * 10 + ob }
  }
  const balance = (unit: 1 | 10): Challenge => {
    const c = rand(5, 10)
    const known = rand(1, c - 1)
    const leftMissing = Math.random() < 0.5
    const id = `balance ${leftMissing ? '?' : known * unit}+${leftMissing ? known * unit : '?'}=${c * unit}`
    return { id, kind: 'balance', a: leftMissing ? null : known * unit, b: leftMissing ? known * unit : null, c: c * unit, unit }
  }
  const add = (x: { a: number; b: number }): Challenge => ({ id: `add ${x.a}+${x.b}`, kind: 'add', ...x })
  const sub = (x: { a: number; b: number }): Challenge => ({ id: `sub ${x.a}-${x.b}`, kind: 'sub', ...x })
  return [add(add2()), balance(1), sub(sub2()), add(add3()), balance(10), sub(sub3())]
}

/** What's on the mat when a challenge starts. */
function startOf(c: Challenge): Tiles {
  if (c.kind === 'add') {
    const a = tilesOf(c.a)
    const b = tilesOf(c.b)
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
  }
  if (c.kind === 'sub') return tilesOf(c.a)
  return NONE
}

const answerOf = (c: Challenge) => (c.kind === 'add' ? c.a + c.b : c.kind === 'sub' ? c.a - c.b : c.c - (c.a ?? c.b ?? 0))

function prompt(c: Challenge, step: number) {
  switch (c.kind) {
    case 'add':
      return `${c.a} + ${c.b}${step === 1 ? ' = ?' : ''}`
    case 'sub':
      return `${c.a} − ${c.b}${step === 1 ? ' = ?' : ''}`
    case 'balance':
      return `${c.a ?? '?'} + ${c.b ?? '?'} = ${c.c}`
  }
}

function spoken(c: Challenge, step: number) {
  if (c.kind === 'balance') return STAMP_LINES.balance
  if (step === 1) return STAMP_LINES.write
  return c.kind === 'add' ? STAMP_LINES.exchange : STAMP_LINES.takeAway
}

export function StampGame({ services, onBack, onStar }: WorkshopProps) {
  const [mode, setMode] = useState<Mode>('explore')
  const [tiles, setTiles] = useState<Tiles>(NONE)

  // Mastery state. `work` is the mat as the child has changed it (null: as the challenge set it).
  const [queue, setQueue] = useState<Challenge[]>(newRun)
  const [missed, setMissed] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [step, setStep] = useState(0)
  const [work, setWork] = useState<Tiles | null>(null)
  const [cards, setCards] = useState<Tiles>(NONE)
  const [mine, setMine] = useState(0)
  const [held, setHeld] = useState(true)
  const [shake, setShake] = useState(0)
  const [runDone, setRunDone] = useState<null | boolean>(null)

  const onExplore = useCallback((c: Tiles) => setTiles(c), [])
  const onWork = useCallback((c: Tiles) => setWork(c), [])
  const current = queue[0]

  const clearChallenge = () => {
    setDirty(false)
    setStep(0)
    setWork(null)
    setCards(NONE)
    setMine(0)
    setHeld(true)
  }

  const finish = () => {
    const c = current
    record(services.shared, { stream: 'workshop', part: 3, item: c.id, correct: !dirty, skill: c.kind })
    sfx('correct')
    const next = advanceQueue(queue, dirty)
    const nextMissed = dirty && !missed.includes(c.id) ? [...missed, c.id] : missed
    setMissed(nextMissed)
    clearChallenge()
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
    record(services.shared, { stream: 'workshop', part: 3, item: current.id, correct: false, skill: current.kind })
  }

  const check = () => {
    const c = current
    if (c.kind === 'balance') {
      // The beam swings free: level is right; otherwise it shows which way, and the child tries again.
      setHeld(false)
      return (c.a ?? c.b ?? 0) / c.unit + mine === c.c / c.unit ? finish() : miss()
    }
    if (step === 1) return tilesValue(cards) === answerOf(c) ? finish() : miss()
    const mat = work ?? startOf(c)
    // Add: every exchange made (each place 0–9). Take away: exactly the second number gone.
    const done = c.kind === 'add' ? mat.every((n) => n <= 9) : tilesValue(mat) === answerOf(c)
    if (!done) return miss()
    sfx('correct')
    setStep(1)
  }

  const restart = () => {
    setQueue(newRun())
    setMissed([])
    setRunDone(null)
    clearChallenge()
  }

  const screen = (body: React.ReactNode) => (
    <WorkshopScreen
      title="Stamp Game"
      mode={mode}
      onMode={(m) => {
        // Each mode starts clear (Explore's sandbox mustn't leak into a challenge, nor a challenge into Explore).
        setMode(m)
        setTiles(NONE)
        clearChallenge()
      }}
      onBack={onBack}
    >
      {body}
    </WorkshopScreen>
  )

  if (mode === 'explore')
    return screen(
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">
        <TileMat tiles={tiles} onChange={onExplore} removable onExchange={cue} className="flex-1 min-h-0 w-full rounded-2xl" />
        <div className="landscape:w-80 flex flex-col gap-3 items-center justify-center shrink-0">
          <TileNotation tiles={tiles} />
          <TileTray tiles={tiles} onChange={setTiles} />
          <div className="text-xs font-bold text-slate-400 text-center">drag ten together · tap to break · drag off to take away</div>
          <button type="button" onClick={() => setTiles(NONE)} className="text-sm font-bold text-slate-400 underline">
            clear the mat
          </button>
        </div>
      </div>,
    )

  // ——— Mastery ———
  if (runDone !== null || !current) return screen(<RunDone star={!!runDone} missed={missed.length} onAgain={restart} />)

  const c = current
  const head = <Prompt text={prompt(c, step)} line={spoken(c, step)} shake={shake} left={queue.length} sayKey={`${c.id}|${step}`} />

  if (c.kind === 'balance')
    return screen(
      <>
        {head}
        <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3 items-center">
          <div className="flex-1 min-h-0 w-full">
            <BalancePuzzle
              given={(c.a ?? c.b ?? 0) / c.unit}
              mine={mine}
              right={c.c / c.unit}
              unit={c.unit}
              held={held}
              onTakeBack={() => {
                setMine((m) => Math.max(0, m - 1))
                setHeld(true)
              }}
            />
          </div>
          <div className="landscape:w-80 flex landscape:flex-col gap-4 items-center justify-center shrink-0">
            <TileButton
              value={c.unit}
              label={`+ ${c.unit === 1 ? 'one' : 'ten'}`}
              onClick={() => {
                cue('tile', mine)
                setMine((m) => Math.min(MAX_IN_PAN, m + 1))
                setHeld(true)
              }}
            />
            <div className="text-xs font-bold text-slate-400 text-center max-w-40">tap a tile in the pan to take it back</div>
            <CheckButton onClick={check} />
          </div>
        </div>
      </>,
    )

  const mat = work ?? startOf(c)
  return screen(
    <>
      {head}
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">
        <TileMat tiles={mat} onChange={step === 0 ? onWork : undefined} removable={c.kind === 'sub'} onExchange={cue} className="flex-1 min-h-0 w-full rounded-2xl" />
        <div className="landscape:w-80 flex flex-col gap-3 items-center justify-center shrink-0">
          {step === 1 && <CardComposer cards={cards} onChange={setCards} />}
          {step === 0 && (
            <div className="text-xs font-bold text-slate-400 text-center">
              {c.kind === 'add' ? 'drag ten together · tap to break' : 'drag tiles off the mat to take them away · tap to break'}
            </div>
          )}
          {step === 0 && c.kind === 'sub' && (
            <button type="button" onClick={() => setWork(null)} className="text-sm font-bold text-slate-400 underline">
              start again
            </button>
          )}
          <CheckButton onClick={check} />
        </div>
      </div>
    </>,
  )
}
