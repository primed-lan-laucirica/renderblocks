/**
 * The Bead Board (Part 4's workshop). Explore has three tables: the bead
 * board (arrays that turn a quarter turn and split between columns),
 * skittles for dealing beads, and stamp tiles shared into lanes. The
 * standard notation beside each always follows the objects. Mastery: show
 * 4 × 6; find every array for 12; share 17 among 5 and write the share and
 * the remainder; share 465 three ways with tiles, breaking a hundred or a
 * ten wherever it won't share. The child deals, turns and breaks everything;
 * nothing is done for them. A missed challenge comes back (the drill rule);
 * a clean run earns the star.
 */
import { useState } from 'react'
import { record } from '../evidence'
import { ArrayBoard } from './boardArray'
import {
  BOARD_LINES,
  NO_ARRAY,
  arrayNotation,
  factorPairs,
  newRun,
  share0,
  shareDone,
  shareNotation,
  tiles0,
  tilesDone,
  tilesNotation,
  toPlaces,
  type ArrayState,
  type Challenge,
  type ShareState,
  type TileState,
} from './boardLogic'
import { ShareTable } from './boardShare'
import { TileShare } from './boardTiles'
import { advanceQueue } from './queue'
import { cue, sfx } from './sound'
import type { WorkshopProps } from './types'
import { CheckButton, Prompt, RunDone, WorkshopScreen, type Mode } from './ui'

type Tool = 'arrays' | 'share' | 'tiles'
const TOOLS: { id: Tool; label: string }[] = [
  { id: 'arrays', label: 'Arrays' },
  { id: 'share', label: 'Skittles' },
  { id: 'tiles', label: 'Tiles' },
]

/**
 * Notation, one "=" step per line (it can run long beside a split array).
 * Its height is fixed, so the table beside it never moves under a finger.
 */
function NotationLines({ text }: { text: string }) {
  const [first, ...rest] = text ? text.split(' = ') : ['—']
  return (
    <div className={`h-36 flex flex-col justify-center text-2xl landscape:text-3xl font-black tabular-nums text-center leading-snug ${text ? 'text-white' : 'text-slate-500'}`}>
      <div>{first}</div>
      {rest.map((r, i) => (
        <div key={i}>= {r}</div>
      ))}
    </div>
  )
}

const BTN = 'rounded-xl px-3 py-2 text-lg font-black min-w-14'
const btn = `${BTN} bg-white/10 active:bg-white/20`
const main = 'flex-1 min-h-0 w-full rounded-2xl'

/** The share and the remainder, written by the child: two boxes and a digit pad. */
function ShareAnswer({ n, k, q, r, focus, onFocus, onDigit }: { n: number; k: number; q: string; r: string; focus: 'q' | 'r'; onFocus: (f: 'q' | 'r') => void; onDigit: (d: string) => void }) {
  const box = (f: 'q' | 'r', v: string) => (
    <button type="button" onClick={() => onFocus(f)} className={`w-14 h-14 rounded-xl border-4 text-3xl font-black ${focus === f ? 'border-amber-400' : 'border-slate-500'}`} aria-label={f === 'q' ? 'Each gets' : 'Left over'}>
      {v}
    </button>
  )
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-3xl font-black tabular-nums">
        {n} ÷ {k} = {box('q', q)} r {box('r', r)}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 10 }, (_, d) => (
          <button key={d} type="button" onClick={() => onDigit(String(d))} className="w-12 h-12 rounded-lg bg-white/10 active:bg-white/20 text-2xl font-black">
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BeadBoardWorkshop({ services, onBack, onStar }: WorkshopProps) {
  const [mode, setMode] = useState<Mode>('explore')
  const [tool, setTool] = useState<Tool>('arrays')
  const [arr, setArr] = useState<ArrayState>(NO_ARRAY)
  const [splitting, setSplitting] = useState(false)
  const [turning, setTurning] = useState(false)
  const [beads, setBeads] = useState<ShareState>(() => share0(13, 4))
  const [tiles, setTiles] = useState<TileState>(() => tiles0(465, 3))

  // Mastery state.
  const [queue, setQueue] = useState<Challenge[]>(() => newRun())
  const [missed, setMissed] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [shake, setShake] = useState(0)
  const [runDone, setRunDone] = useState<null | boolean>(null)
  const [found, setFound] = useState<string[]>([])
  const [answer, setAnswer] = useState<{ q: string; r: string; focus: 'q' | 'r' }>({ q: '', r: '', focus: 'q' })
  const current = queue[0]

  /** A clean table for a challenge (or for Explore). */
  const setUp = (c: Challenge | undefined) => {
    setArr(NO_ARRAY)
    setSplitting(false)
    setTurning(false)
    setFound([])
    setAnswer({ q: '', r: '', focus: 'q' })
    if (c?.kind === 'share') setBeads(share0(c.n, c.k))
    if (c?.kind === 'divide') setTiles(tiles0(c.n, c.k))
  }

  const finish = (right: boolean) => {
    const c = current
    record(services.shared, { stream: 'workshop', part: 4, item: c.id, correct: right && !dirty, skill: c.kind })
    sfx('correct')
    const next = advanceQueue(queue, dirty)
    const nextMissed = dirty && !missed.includes(c.id) ? [...missed, c.id] : missed
    setMissed(nextMissed)
    setDirty(false)
    setUp(next[0])
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
    record(services.shared, { stream: 'workshop', part: 4, item: current.id, correct: false, skill: current.kind })
  }

  const check = () => {
    const c = current
    if (c.kind === 'array') return (arr.rows === c.rows && arr.cols === c.cols) || (arr.rows === c.cols && arr.cols === c.rows) ? finish(true) : miss()
    if (c.kind === 'every') {
      if (arr.rows * arr.cols !== c.n) return miss()
      const key = [arr.rows, arr.cols].sort((a, b) => a - b).join('×')
      // One already found: not a miss, just not new.
      if (found.includes(key)) return setShake((s) => s + 1)
      const all = [...found, key]
      if (all.length >= factorPairs(c.n).length) return finish(true)
      sfx('correct')
      setFound(all)
      setArr(NO_ARRAY)
      return
    }
    if (c.kind === 'share') return shareDone(beads) && answer.q !== '' && answer.r !== '' && Number(answer.q) === beads.shares[0] && Number(answer.r) === beads.pile ? finish(true) : miss()
    return tilesDone(tiles) ? finish(true) : miss()
  }

  const restart = () => {
    const run = newRun()
    setQueue(run)
    setMissed([])
    setRunDone(null)
    setUp(run[0])
  }

  const screen = (body: React.ReactNode) => (
    <WorkshopScreen
      title="Bead Board"
      mode={mode}
      onMode={(m) => {
        // Each mode starts on a clean table.
        setMode(m)
        setUp(m === 'mastery' ? current : undefined)
        if (m === 'explore') {
          setBeads(share0(13, 4))
          setTiles(tiles0(465, 3))
        }
      }}
      onBack={onBack}
    >
      {body}
    </WorkshopScreen>
  )

  // The board, with its turn / split / clear buttons.
  const turn = () => arr.rows && !turning && setTurning(true)
  const board = (
    <ArrayBoard
      value={arr}
      onChange={setArr}
      splitting={splitting}
      turning={turning}
      onTurned={() => {
        setArr({ rows: arr.cols, cols: arr.rows, split: null })
        setTurning(false)
      }}
      className={main}
    />
  )
  const boardButtons = (withSplit: boolean) => (
    <div className="flex flex-wrap gap-2 justify-center">
      <button type="button" onClick={turn} className={btn} aria-label="Turn a quarter turn">
        ↻ turn
      </button>
      {withSplit && (
        <button type="button" onClick={() => setSplitting(!splitting)} className={splitting ? `${BTN} bg-amber-500 text-slate-900` : btn}>
          ✂ split
        </button>
      )}
      <button type="button" onClick={() => setArr(NO_ARRAY)} className={btn}>
        clear
      </button>
    </div>
  )
  const side = (children: React.ReactNode) => <div className="landscape:w-80 flex flex-col gap-3 items-center justify-center shrink-0">{children}</div>
  const row = (children: React.ReactNode) => <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">{children}</div>

  if (mode === 'explore') {
    const k = beads.shares.length
    return screen(
      <>
        <div className="flex gap-2">
          {TOOLS.map((x) => (
            <button key={x.id} type="button" onClick={() => setTool(x.id)} className={`rounded-lg px-3 py-1.5 font-black ${tool === x.id ? 'bg-white text-slate-900' : 'bg-white/10'}`}>
              {x.label}
            </button>
          ))}
        </div>
        {tool === 'arrays' &&
          row(
            <>
              {board}
              {side(
                <>
                  <NotationLines text={arrayNotation(arr)} />
                  {boardButtons(true)}
                </>,
              )}
            </>,
          )}
        {tool === 'share' &&
          row(
            <>
              <ShareTable value={beads} onChange={setBeads} onDeal={() => cue('bead')} className={main} />
              {side(
                <>
                  <NotationLines text={shareNotation(beads)} />
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button type="button" className={btn} onClick={() => setBeads({ ...beads, pile: Math.min(60, beads.pile + 1) })}>
                      + bead
                    </button>
                    <button type="button" className={btn} onClick={() => setBeads({ ...beads, pile: Math.max(0, beads.pile - 1) })}>
                      − bead
                    </button>
                    <button type="button" className={btn} onClick={() => k < 8 && setBeads({ ...beads, shares: [...beads.shares, 0] })}>
                      + skittle
                    </button>
                    <button type="button" className={btn} onClick={() => k > 2 && setBeads({ pile: beads.pile + beads.shares[k - 1], shares: beads.shares.slice(0, -1) })}>
                      − skittle
                    </button>
                    <button type="button" className={btn} onClick={() => setBeads(share0(beads.pile + beads.shares.reduce((a, b) => a + b, 0), k))}>
                      gather
                    </button>
                  </div>
                </>,
              )}
            </>,
          )}
        {tool === 'tiles' &&
          row(
            <>
              <TileShare value={tiles} onChange={setTiles} onCue={(c) => cue(c)} className={main} />
              {side(
                <>
                  <NotationLines text={tilesNotation(tiles)} />
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[100, 10, 1].map((v) => (
                      <button key={v} type="button" className={btn} onClick={() => setTiles({ ...tiles, supply: tiles.supply.map((n, p) => (10 ** p === v ? Math.min(19, n + 1) : n)) as TileState['supply'] })}>
                        + {v}
                      </button>
                    ))}
                    <button type="button" className={btn} onClick={() => tiles.lanes.length < 4 && setTiles({ ...tiles, lanes: [...tiles.lanes, [0, 0, 0]] })}>
                      + lane
                    </button>
                    <button type="button" className={btn} onClick={() => {
                        // The last lane's tiles go back to the supply.
                        const last = tiles.lanes[tiles.lanes.length - 1]
                        if (tiles.lanes.length > 2) setTiles({ supply: tiles.supply.map((n, p) => n + last[p]) as TileState['supply'], lanes: tiles.lanes.slice(0, -1) })
                      }}>
                      − lane
                    </button>
                    <button type="button" className={btn} onClick={() => setTiles({ supply: toPlaces(0), lanes: tiles.lanes.map(() => [0, 0, 0]) })}>
                      clear
                    </button>
                  </div>
                </>,
              )}
            </>,
          )}
      </>,
    )
  }

  // ——— Mastery ———
  if (runDone !== null || !current) return screen(<RunDone star={!!runDone} missed={missed.length} onAgain={restart} />)

  const c = current
  const text = c.kind === 'array' ? `Show ${c.rows} × ${c.cols}` : c.kind === 'every' ? `Every array for ${c.n}` : c.kind === 'share' ? `Share ${c.n} among ${c.k}` : `${c.n} ÷ ${c.k}`
  return screen(
    <>
      <Prompt text={text} line={BOARD_LINES[c.kind]} shake={shake} left={queue.length} sayKey={c.id} />
      {(c.kind === 'array' || c.kind === 'every') &&
        row(
          <>
            {board}
            {side(
              <>
                {c.kind === 'every' && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-lg font-bold text-slate-400">
                      found {found.length} of {factorPairs(c.n).length}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {found.map((f) => (
                        <span key={f} className="rounded-lg bg-white/10 px-2 py-1 text-xl font-black tabular-nums">
                          {f.replace('×', ' × ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {boardButtons(false)}
                <CheckButton onClick={check} />
              </>,
            )}
          </>,
        )}
      {c.kind === 'share' &&
        row(
          <>
            <ShareTable value={beads} onChange={setBeads} onDeal={() => cue('bead')} className={main} />
            {side(
              <>
                <ShareAnswer
                  n={c.n}
                  k={c.k}
                  q={answer.q}
                  r={answer.r}
                  focus={answer.focus}
                  onFocus={(focus) => setAnswer({ ...answer, focus })}
                  onDigit={(d) => setAnswer(answer.focus === 'q' ? { ...answer, q: d, focus: 'r' } : { ...answer, r: d })}
                />
                <CheckButton onClick={check} />
              </>,
            )}
          </>,
        )}
      {c.kind === 'divide' &&
        row(
          <>
            <TileShare value={tiles} onChange={setTiles} onCue={(x) => cue(x)} className={main} />
            {side(<CheckButton onClick={check} />)}
          </>,
        )}
    </>,
  )
}
