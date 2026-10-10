/**
 * The Fraction Table (Part 5's workshop). Explore: fraction circles that can
 * be cut, laid over each other and joined, in frames or loose on the table,
 * with the notation for each frame and each pile beside them; and the track,
 * where strips lie end to end from 0. Mastery, on the drill engine's rules
 * (a miss comes back until it's right first time; a clean run earns a star):
 *   show 3/4 (symbols → pieces); make an amount another way (equivalence);
 *   put fractions where they lie on the track (order); add like fractions
 *   and join pieces into wholes, by hand.
 * Answers are built, never picked; every cut and join is the child's.
 */
import { useState } from 'react'
import { record } from '../evidence'
import { FractionPiece } from '../kit/kit'
import { SANS } from '../kit/sizes'
import { FractionCircles, type FrameSpec, type Tool } from './fractionCircles'
import { SIZES, TURN, groupNotation, lcm, looseGroups, makeup, span, sumOf, total, trackNotation, unitName, type Piece } from './fractionModel'
import { TRACK_MAX, TrackExplore, TrackPlace, type Card } from './fractionTrack'
import { FT_LINES } from './fractionLines'
import { advanceQueue } from './queue'
import { cue, sfx } from './sound'
import type { WorkshopProps } from './types'
import { CheckButton, Prompt, RunDone, WorkshopScreen, type Mode } from './ui'

// ——— the table's layouts ———
const TWO: FrameSpec[] = [
  { x: 260, y: 260 },
  { x: 740, y: 260 },
]
const ONE: FrameSpec[] = [{ x: 500, y: 260 }]
/** Where a piece from the box lands: the first free spot on the table. */
const SPOTS = [
  { x: 180, y: 680 },
  { x: 500, y: 680 },
  { x: 820, y: 680 },
  { x: 180, y: 860 },
  { x: 500, y: 860 },
  { x: 820, y: 860 },
]

function addFromBox(pieces: Piece[], d: number): Piece[] {
  const id = pieces.reduce((m, p) => Math.max(m, p.id), 0) + 1
  const groups = looseGroups(pieces)
  const spot = SPOTS.find((s) => !groups.some((g) => Math.hypot(g[0].x - s.x, g[0].y - s.y) < 60)) ?? SPOTS[0]
  return [...pieces, { id, d, a: 0, frame: null, x: spot.x, y: spot.y }]
}

/** n pieces of 1/d in a frame, side by side. */
const filled = (n: number, d: number, frame: number, from = 0): Piece[] => Array.from({ length: n }, (_, j) => ({ id: from + j + 1, d, a: (j * span(d)) % TURN, frame, x: 0, y: 0 }))

// ——— Mastery ———
type Challenge =
  | { id: string; kind: 'show'; n: number; d: number }
  | { id: string; kind: 'same'; n: number; d: number }
  | { id: string; kind: 'track'; cards: Card[] }
  | { id: string; kind: 'add'; a: number; b: number; d: number }

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]
const shuffle = <T,>(xs: T[]): T[] => [...xs].sort(() => Math.random() - 0.5)
const denOf = (cards: Card[]) => cards.reduce((m, c) => lcm(m, c.d), 1)

/** A run: show 3/4; 1/2 another way; three fractions on the track; 3/4 + 2/4; then a fresh one of each. */
function newRun(): Challenge[] {
  const [sn, sd] = pick([
    [2, 3],
    [5, 8],
    [5, 6],
    [3, 8],
    [7, 12],
  ])
  const [en, ed] = pick([
    [3, 4],
    [2, 3],
    [1, 3],
    [1, 4],
  ])
  const track = pick<Card[]>([
    [
      { n: 2, d: 3 },
      { n: 5, d: 4 },
      { n: 1, d: 6 },
    ],
    [
      { n: 3, d: 2 },
      { n: 1, d: 3 },
      { n: 5, d: 6 },
    ],
    [
      { n: 3, d: 8 },
      { n: 3, d: 4 },
      { n: 5, d: 4 },
    ],
  ])
  const [aa, ab, ad] = pick([
    [2, 2, 3],
    [5, 5, 8],
    [3, 3, 4],
    [5, 3, 6],
  ])
  return [
    { id: 'show 3/4', kind: 'show', n: 3, d: 4 },
    { id: 'same 1/2', kind: 'same', n: 1, d: 2 },
    {
      id: 'track A',
      kind: 'track',
      cards: shuffle([
        { n: 1, d: 2 },
        { n: 3, d: 4 },
        { n: 1, d: 4 },
      ]),
    },
    { id: 'add 3/4 2/4', kind: 'add', a: 3, b: 2, d: 4 },
    { id: `show ${sn}/${sd}`, kind: 'show', n: sn, d: sd },
    { id: `same ${en}/${ed}`, kind: 'same', n: en, d: ed },
    { id: 'track B', kind: 'track', cards: shuffle(track) },
    { id: `add ${aa}/${ad} ${ab}/${ad}`, kind: 'add', a: aa, b: ab, d: ad },
  ]
}

/** The table a challenge starts with. */
function setup(c: Challenge | undefined): { pieces: Piece[]; frames: FrameSpec[] } {
  if (!c || c.kind === 'show' || c.kind === 'track') return { pieces: [], frames: ONE }
  if (c.kind === 'same') return { pieces: filled(c.n, c.d, 0), frames: [{ ...TWO[0], locked: true }, TWO[1]] }
  return { pieces: [...filled(c.a, c.d, 0), ...filled(c.b, c.d, 1, c.a)], frames: TWO }
}

function promptOf(c: Challenge) {
  switch (c.kind) {
    case 'show':
      return `Show ${c.n}/${c.d}`
    case 'same':
      return `Make ${c.n}/${c.d} another way`
    case 'track':
      return 'Put them on the track'
    case 'add':
      return `${c.a}/${c.d} + ${c.b}/${c.d}`
  }
}
function spoken(c: Challenge) {
  return { show: FT_LINES.show, same: FT_LINES.same, track: FT_LINES.track, add: FT_LINES.add }[c.kind]
}

// ——— the controls beside the table ———
const TOOLS: { t: Tool; label: string }[] = [
  { t: 'move', label: 'Move' },
  { t: 'cut2', label: 'Cut in 2' },
  { t: 'cut3', label: 'Cut in 3' },
  { t: 'join', label: 'Join' },
]

function Tools({ tool, onTool }: { tool: Tool; onTool: (t: Tool) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 w-full">
      {TOOLS.map(({ t, label }) => (
        <button key={t} type="button" onClick={() => onTool(t)} className={`rounded-lg px-1 py-2 text-base font-black leading-tight ${tool === t ? 'bg-amber-500 text-slate-900' : 'bg-white/10'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

/** The box of pieces: one tap, one piece onto the table. */
function Box({ onAdd, sizes = SIZES }: { onAdd: (d: number) => void; sizes?: number[] }) {
  return (
    <div className="grid grid-cols-7 gap-1 w-full">
      {sizes.map((d) => (
        <button key={d} type="button" onClick={() => onAdd(d)} className="rounded-lg bg-slate-800 border-2 border-slate-600 active:bg-slate-700 flex flex-col items-center py-1" aria-label={`Add ${unitName(d)}`}>
          <svg viewBox="-60 -60 120 120" className="w-9 h-9">
            <FractionPiece d={d} k={0} cx={0} cy={0} r={54} />
          </svg>
          <span className="text-sm font-black" style={{ fontFamily: SANS }}>
            {unitName(d)}
          </span>
        </button>
      ))}
    </div>
  )
}

/** The notation for what's on the table: each frame's sum, each loose pile's. */
function TableNotation({ pieces, frames }: { pieces: Piece[]; frames: FrameSpec[] }) {
  const lines = [
    ...frames.map((_, i) => sumOf(pieces.filter((p) => p.frame === i))),
    ...looseGroups(pieces).map(groupNotation),
  ].filter(Boolean)
  return (
    // A fixed height, so the table doesn't move under his finger as lines come and go.
    <div className={`flex flex-col items-center justify-center h-28 overflow-hidden font-black tabular-nums text-center leading-tight ${lines.length > 3 ? 'text-lg' : 'text-2xl'}`} style={{ fontFamily: SANS }}>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  )
}

export function FractionTable({ services, onBack, onStar }: WorkshopProps) {
  const [mode, setMode] = useState<Mode>('explore')
  const [view, setView] = useState<'circles' | 'track'>('circles')
  const [tool, setTool] = useState<Tool>('move')
  const [pieces, setPieces] = useState<Piece[]>([])
  const [strips, setStrips] = useState<number[]>([])

  // Mastery state.
  const [queue, setQueue] = useState<Challenge[]>(newRun)
  const [missed, setMissed] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [shake, setShake] = useState(0)
  const [runDone, setRunDone] = useState<null | boolean>(null)
  const current = queue[0]
  const [work, setWork] = useState(() => setup(current))
  const [cardsAt, setCardsAt] = useState<(number | null)[]>([null, null, null])

  const startOn = (c: Challenge | undefined) => {
    setWork(setup(c))
    setCardsAt([null, null, null])
    setTool('move')
  }

  const finish = () => {
    const c = current
    record(services.shared, { stream: 'workshop', part: 5, item: c.id, correct: !dirty, skill: c.kind })
    sfx('correct')
    const next = advanceQueue(queue, dirty)
    const nextMissed = dirty && !missed.includes(c.id) ? [...missed, c.id] : missed
    setMissed(nextMissed)
    setDirty(false)
    if (next.length === 0) {
      const star = nextMissed.length === 0
      setRunDone(star)
      if (star) {
        sfx('celebrate')
        onStar()
      }
    }
    setQueue(next)
    startOn(next[0])
  }
  const miss = () => {
    sfx('wrong')
    setDirty(true)
    setShake((s) => s + 1)
    record(services.shared, { stream: 'workshop', part: 5, item: current.id, correct: false, skill: current.kind })
  }

  const check = () => {
    const c = current
    const inFrame = (f: number) => work.pieces.filter((p) => p.frame === f)
    switch (c.kind) {
      case 'show':
        return total(inFrame(0)) === (c.n * TURN) / c.d ? finish() : miss()
      case 'same': {
        const mine = inFrame(1)
        return total(mine) === (c.n * TURN) / c.d && makeup(mine) !== makeup(inFrame(0)) ? finish() : miss()
      }
      case 'track': {
        const den = denOf(c.cards)
        return c.cards.every((card, i) => cardsAt[i] === (card.n * den) / card.d) ? finish() : miss()
      }
      case 'add': {
        // Every whole there is to make, made: joined into one whole piece.
        const sum = ((c.a + c.b) * TURN) / c.d
        const wholes = work.pieces.filter((p) => p.d === 1).length
        return wholes === Math.floor(sum / TURN) && total(work.pieces) === sum ? finish() : miss()
      }
    }
  }

  const restart = () => {
    const run = newRun()
    setQueue(run)
    setMissed([])
    setRunDone(null)
    startOn(run[0])
  }

  // Each mode starts on a clear table (Explore's sandbox mustn't leak into a challenge).
  const screen = (body: React.ReactNode) => (
    <WorkshopScreen
      title="Fraction Table"
      mode={mode}
      onMode={(m) => {
        setMode(m)
        setPieces([])
        setStrips([])
        setTool('move')
        startOn(current)
      }}
      onBack={onBack}
    >
      {body}
    </WorkshopScreen>
  )

  if (mode === 'explore') {
    const toggle = (
      <div className="grid grid-cols-2 gap-1.5 w-full">
        {(['circles', 'track'] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`rounded-lg py-2 font-black ${view === v ? 'bg-white text-slate-900' : 'bg-white/10'}`}>
            {v === 'circles' ? 'Circles' : 'Track'}
          </button>
        ))}
      </div>
    )
    if (view === 'track') {
      const room = TRACK_MAX - strips.reduce((s, d) => s + span(d), 0)
      return screen(
        <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <TrackExplore ds={strips} className="w-full max-h-full rounded-2xl" />
          </div>
          <div className="landscape:w-80 flex flex-col gap-3 items-center justify-center shrink-0">
            {toggle}
            <div className="text-3xl font-black tabular-nums text-center" style={{ fontFamily: SANS }}>
              {trackNotation(strips)}
            </div>
            <Box
              onAdd={(d) => {
                if (span(d) > room) return
                setStrips([...strips, d])
                cue('place', strips.length + 1)
              }}
            />
            <button type="button" onClick={() => setStrips(strips.slice(0, -1))} className="text-sm font-bold text-slate-400 underline">
              take one off
            </button>
          </div>
        </div>,
      )
    }
    return screen(
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">
        <FractionCircles pieces={pieces} frames={TWO} tool={tool} onChange={setPieces} className="flex-1 min-h-0 w-full rounded-2xl" />
        <div className="landscape:w-80 flex flex-col gap-2 items-center justify-center shrink-0">
          {toggle}
          <TableNotation pieces={pieces} frames={TWO} />
          <Tools tool={tool} onTool={setTool} />
          <Box onAdd={(d) => setPieces(addFromBox(pieces, d))} />
          <button type="button" onClick={() => setPieces([])} className="text-sm font-bold text-slate-400 underline">
            clear the table
          </button>
        </div>
      </div>,
    )
  }

  // ——— Mastery ———
  if (runDone !== null || !current) return screen(<RunDone star={!!runDone} missed={missed.length} onAgain={restart} />)

  const c = current
  return screen(
    <>
      <Prompt text={promptOf(c)} line={spoken(c)} shake={shake} left={queue.length} sayKey={c.id} />
      {c.kind === 'track' ? (
        <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3 items-center">
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            <TrackPlace cards={c.cards} den={denOf(c.cards)} at={cardsAt} onChange={setCardsAt} className="w-full max-h-full rounded-2xl" />
          </div>
          <CheckButton onClick={check} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">
          <FractionCircles
            pieces={work.pieces}
            frames={work.frames}
            tool={tool}
            onChange={(ps) => setWork({ ...work, pieces: ps })}
            removable={c.kind !== 'add'}
            className="flex-1 min-h-0 w-full rounded-2xl"
          />
          <div className="landscape:w-80 flex flex-col gap-2 items-center justify-center shrink-0">
            <Tools tool={tool} onTool={setTool} />
            {c.kind !== 'add' && <Box onAdd={(d) => setWork({ ...work, pieces: addFromBox(work.pieces, d) })} />}
            {c.kind !== 'add' && (
              <button type="button" onClick={() => setWork(setup(c))} className="text-sm font-bold text-slate-400 underline">
                clear the table
              </button>
            )}
            <CheckButton onClick={check} />
          </div>
        </div>
      )}
    </>,
  )
}
