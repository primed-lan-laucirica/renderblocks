/**
 * A stage's Bench: the signs he has watched, to use. An equation line on
 * top, and under it what the line says, as beads on the balance. The beam
 * leans by the two amounts and the relation sign turns gold when the line
 * is true; a line that is not true stays plain ink.
 *
 * Explore: his own lines, from a palette of digits and his signs; the
 * balance follows as he writes. Mastery: a run of eight (write what you
 * see, make it true), checked with ✓; a miss comes back three places later
 * and a run with no miss earns the stage's star.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { GameServices } from '@renderblocks/kernel'
import { clamp, smooth } from '@renderblocks/scene/ease'
import { blendLists } from '../engine/compile'
import { say } from '../engine/voice'
import { record } from '../evidence'
import { items, place, Token, widthOf } from '../kit/glyphs'
import { GOLD, GOLD_EDGE, INK, PAPER, SANS, SOFT } from '../kit/look'
import { line, Sprites, type Sprite } from '../kit/sprites'
import { check, filled, makeRun, type Item } from './items'
import { SAY } from './lines'
import { expression, isDigit, isRelation, join, READS, statement, type Node } from './parse'
import { benchSprites, panOf } from './picture'
import { advanceQueue, LOCKOUT_MS } from './queue'
import { cue, sfx } from '../engine/sound'

interface Props {
  services: GameServices
  stage: number
  /** The signs he has watched. */
  signs: string[]
  /** The Mastery run is open. */
  mastery: boolean
  /** The stage's star is earned. */
  starred: boolean
  onStar: () => void
  onBack: () => void
}

type Mode = 'explore' | 'mastery'

// ── the stage (1920 × 1080) ──────────────────────────────────────────────

const W = 1920
const H = 1080
const MID = W / 2
const LINE_Y = 200
const LINE_MAX = 140
/** A line shrinks to fit, down to this size; then it takes no more tiles. */
const LINE_MIN = 60
const LINE_ROOM = 1680
const BALANCE_Y = 410
const TILE_W = 124
const TILE_H = 92
const STEP = TILE_W + 8
const ROW_1 = 926
const ROW_2 = 1026
/** A right answer is shown this long before the next item. */
const RIGHT_MS = 1100
const DIGITS = '0123456789'.split('')
const CARD = '#fbf6ea'
const EDGE = '#cbbd9f'

// ── the line ─────────────────────────────────────────────────────────────

/** A token on the line, named by where it stands (so a numeral that grows stays one token). */
interface Named {
  g: string
  k: string
  /** The gap it fills, or stands for (-1: none). */
  gap: number
}

const named = (toks: string[]): Named[] => toks.map((g, i) => ({ g, k: `ln/${i}`, gap: -1 }))

/** A "make it true" line: its own tokens, and each gap as its dashed box or what he has put in it. */
function gapped(item: Item, fills: string[][]): Named[] {
  let g = -1
  return item.toks.flatMap((t, i): Named[] => {
    if (t !== '_') return [{ g: t, k: `ln/f${i}`, gap: -1 }]
    g++
    const gap = g
    const mine = join(fills[gap] ?? [])
    return mine.length ? mine.map((x, j) => ({ g: x, k: `ln/g${gap}.${j}`, gap })) : [{ g: '_', k: `ln/g${gap}.0`, gap }]
  })
}

/** A line's width, in units of its size. */
function units(toks: Named[]) {
  if (!toks.length) return 0
  const list = items(toks)
  const xs = place(list, 1)
  return 2 * (xs[xs.length - 1] + widthOf(list[list.length - 1]) / 2)
}
const sizeOf = (toks: Named[]) => Math.min(LINE_MAX, LINE_ROOM / Math.max(units(toks), 0.01))
const fits = (tiles: string[]) => tiles.length <= 40 && LINE_ROOM / Math.max(units(named(join(tiles))), 0.01) >= LINE_MIN

/** Where each gap stands on the line: from x0 to x1. */
function spans(toks: Named[], size: number): { gap: number; x0: number; x1: number }[] {
  const list = items(toks)
  const xs = place(list, size)
  const out = new Map<number, { gap: number; x0: number; x1: number }>()
  toks.forEach((t, i) => {
    if (t.gap < 0) return
    const half = (widthOf(list[i]) * size) / 2
    const s = out.get(t.gap) ?? { gap: t.gap, x0: Infinity, x1: -Infinity }
    out.set(t.gap, { gap: t.gap, x0: Math.min(s.x0, MID + xs[i] - half), x1: Math.max(s.x1, MID + xs[i] + half) })
  })
  return [...out.values()]
}

/** The two sides of a "make it true" line that can be shown before it is answered (a side with a gap cannot), and whether either is missing. */
function sides(item: Item): [Node | null, Node | null, boolean] {
  const rel = item.toks.findIndex(isRelation)
  const cut = rel >= 0 ? rel : item.toks.indexOf('_')
  const [l, r] = [item.toks.slice(0, cut), item.toks.slice(cut + 1)]
  const read = (side: string[]) => (side.includes('_') ? null : expression(side))
  return [read(l), read(r), l.includes('_') || r.includes('_')]
}

// ── a mastery run ────────────────────────────────────────────────────────

interface Run {
  queue: Item[]
  /** His tiles: the whole line (write), or each gap's (make). */
  fills: string[][]
  /** The gap his next tile goes in. */
  active: number
  /** This item has been missed (it comes back). */
  dirty: boolean
  /** No miss in the run so far. */
  clean: boolean
  phase: 'ask' | 'miss' | 'right' | 'done'
}

const blank = (item?: Item): string[][] => (item?.skill === 'make' ? item.wants.map(() => []) : [[]])

function begin(signs: string[], seed: number): Run {
  const queue = makeRun(signs, seed)
  return { queue, fills: blank(queue[0]), active: 0, dirty: false, clean: true, phase: 'ask' }
}

/** Has he put down enough to check? */
const ready = (item: Item, fills: string[][]) => (item.skill === 'write' ? (fills[0]?.length ?? 0) > 0 : item.wants.every((_, i) => (fills[i]?.length ?? 0) > 0))

// ── the tween ────────────────────────────────────────────────────────────

/** What is drawn follows what should be, over a moment (the kit's blend, by name). */
function useBlend(target: Sprite[], ms = 320): Sprite[] {
  const [shown, setShown] = useState(target)
  const now = useRef(target)
  useEffect(() => {
    if (now.current === target) return
    // Part of the way through a cross-fade a name is there twice: carry on from the one coming in.
    const from = [...new Map(now.current.map((s) => [s.k, s])).values()]
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = clamp((t - t0) / ms)
      const list = k >= 1 ? target : blendLists(from, target, smooth(k))
      now.current = list
      setShown(list)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return shown
}

// ── drawn controls ───────────────────────────────────────────────────────

const star = (r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const d = i % 2 ? r * 0.44 : r
    return `${(d * Math.cos(a)).toFixed(1)},${(d * Math.sin(a)).toFixed(1)}`
  }).join(' ')

function Star({ x, y, r, won }: { x: number; y: number; r: number; won: boolean }) {
  return <polygon transform={`translate(${x} ${y})`} points={star(r)} fill={won ? GOLD : 'none'} stroke={won ? GOLD_EDGE : SOFT} strokeWidth={Math.max(2.5, r * 0.07)} strokeLinejoin="round" strokeDasharray={won ? undefined : `${r * 0.16} ${r * 0.12}`} />
}

/** A card to press: a palette tile, a pill, a button. */
function Tile({ x, y, w, h = TILE_H, on = true, gold = false, label, onTap, children }: { x: number; y: number; w: number; h?: number; on?: boolean; gold?: boolean; label: string; onTap: () => void; children: ReactNode }) {
  return (
    <g
      className="bench-tile"
      transform={`translate(${x} ${y})`}
      opacity={on ? 1 : 0.28}
      role="button"
      aria-label={label}
      aria-disabled={!on}
      style={{ cursor: on ? 'pointer' : 'default' }}
      onPointerDown={(e) => {
        e.preventDefault()
        if (on) onTap()
      }}
    >
      <rect x={-w / 2 + 3} y={-h / 2 + 6} width={w} height={h} rx={18} fill={INK} opacity={0.14} />
      <rect className="bench-face" x={-w / 2} y={-h / 2} width={w} height={h} rx={18} fill={CARD} stroke={gold ? GOLD : EDGE} strokeWidth={gold ? 7 : 3} />
      <g pointerEvents="none">{children}</g>
    </g>
  )
}

const stroke = { fill: 'none', stroke: INK, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Take the last tile back. */
const BackGlyph = () => (
  <g {...stroke} strokeWidth={5.5}>
    <path d="M -34 0 L -12 -25 H 32 V 25 H -12 Z" />
    <path d="M 0 -11 L 20 11 M 20 -11 L 0 11" />
  </g>
)

/** Start again: round and back to the start. */
const AgainGlyph = ({ r = 24 }: { r?: number }) => (
  <g {...stroke} strokeWidth={r * 0.26}>
    <path d={`M ${r * 0.87} ${-r * 0.5} A ${r} ${r} 0 1 0 ${r} ${r * 0.1}`} />
    <path d={`M ${r * 0.95} ${-r * 1.15} V ${-r * 0.45} H ${r * 0.25}`} />
  </g>
)

const Padlock = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M -8 -3 V -10 A 8 8 0 0 1 8 -10 V -3" fill="none" stroke={INK} strokeWidth={4} />
    <rect x={-13} y={-3} width={26} height={21} rx={4} fill={INK} />
  </g>
)

const words = (size: number, colour = INK) => ({ fontFamily: SANS, fontWeight: 700, fontSize: size, fill: colour, textAnchor: 'middle', dominantBaseline: 'central' }) as const

// ── the Bench ────────────────────────────────────────────────────────────

export function Bench({ services, stage, signs, mastery, starred, onStar, onBack }: Props) {
  const has = signs.join(' ')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the signs themselves, not the list they came in
  const mine = useMemo(() => READS.filter((g) => signs.includes(g)), [has])
  /** There is a run to do: Mastery is open and he has the signs for eight items. */
  const open = useMemo(() => mastery && makeRun(mine, 1).length > 0, [mastery, mine])

  const [mode, setMode] = useState<Mode>('explore')
  const [tiles, setTiles] = useState<string[]>([])
  const [run, setRun] = useState<Run | null>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const item = mode === 'mastery' && run && run.phase !== 'done' ? run.queue[0] : undefined
  /** A miss is being shown, or a right answer: nothing can be pressed. */
  const busy = mode === 'mastery' && (run?.phase === 'miss' || run?.phase === 'right')
  const asking = mode === 'explore' || run?.phase === 'ask'

  // What the Bench shows: the line, and the two pans under it.
  const view = useMemo(() => {
    let toks: Named[] = []
    let pans: Sprite[]
    let gold: string[] = []
    const relOf = (list: Named[]) => list.filter((t) => isRelation(t.g)).map((t) => t.k)
    if (mode === 'explore') {
      toks = named(join(tiles))
      const s = statement(toks.map((t) => t.g))
      if (s.truth) gold = [toks[s.relAt].k]
      pans = benchSprites(panOf(s.left), panOf(s.right), { y: BALANCE_Y })
    } else if (!run || !item) {
      pans = benchSprites(panOf(null), panOf(null), { y: BALANCE_Y })
    } else if (item.skill === 'write') {
      // The picture is the item's; the line is his.
      toks = named(join(run.fills[0] ?? []))
      const s = statement(item.toks, true)
      if (run.phase === 'right') gold = relOf(toks)
      pans = benchSprites(panOf(s.left), panOf(s.right), { y: BALANCE_Y })
    } else {
      toks = gapped(item, run.fills)
      if (run.phase === 'right') {
        // Made true: the whole line on the balance, the blocks gone.
        const s = statement(filled(item, run.fills), true)
        gold = relOf(toks)
        pans = benchSprites(panOf(s.left), panOf(s.right), { y: BALANCE_Y })
      } else {
        const [l, r, propped] = sides(item)
        pans = benchSprites(panOf(l), panOf(r), { y: BALANCE_Y, propped })
      }
    }
    const size = sizeOf(toks)
    return { toks, size, sprites: [...pans, ...line(toks, { x: MID, y: LINE_Y, size, gold })], truth: gold.length > 0 }
  }, [mode, tiles, run, item])

  const shown = useBlend(view.sprites)
  const onLine = (s: Sprite) => s.k.startsWith('ln/')

  // In Explore, a line that comes true rings.
  const rang = useRef(false)
  useEffect(() => {
    if (mode === 'explore' && view.truth && !rang.current) cue('equals')
    rang.current = view.truth
  }, [mode, view.truth])

  // ── his tiles ──

  const put = (g: string) => {
    if (mode === 'explore') {
      const next = [...tiles, g]
      if (!fits(next)) return
      cue(isDigit(g) ? 'digit' : 'slide', isDigit(g) ? Number(g) : 0)
      return setTiles(next)
    }
    if (!run || !item || run.phase !== 'ask') return
    const tone = () => cue(isDigit(g) ? 'digit' : 'slide', isDigit(g) ? Number(g) : 0)
    if (item.skill === 'write') {
      const next = [...(run.fills[0] ?? []), g]
      if (!fits(next)) return
      tone()
      return setRun({ ...run, fills: [next] })
    }
    const a = run.active
    const fills = run.fills.map((f) => [...f])
    let active = a
    if (item.wants[a] === 'sign') {
      // A sign gap holds one sign; then on to the next empty gap.
      if (isDigit(g)) return
      fills[a] = [g]
      const empty = fills.findIndex((f) => !f.length)
      if (empty >= 0) active = empty
    } else {
      if (!isDigit(g) || fills[a].length >= 3) return
      fills[a].push(g)
    }
    tone()
    setRun({ ...run, fills, active })
  }

  const takeBack = () => {
    if (mode === 'explore') {
      if (tiles.length) cue('slide')
      return setTiles(tiles.slice(0, -1))
    }
    if (!run || !item || run.phase !== 'ask') return
    cue('slide')
    if (item.skill === 'write') return setRun({ ...run, fills: [(run.fills[0] ?? []).slice(0, -1)] })
    // From the gap he is on; if that is empty, from the last gap that is not.
    let a = run.active
    if (!run.fills[a].length)
      for (let i = run.fills.length - 1; i >= 0; i--)
        if (run.fills[i].length) {
          a = i
          break
        }
    setRun({ ...run, active: a, fills: run.fills.map((f, i) => (i === a ? f.slice(0, -1) : f)) })
  }

  const clear = () => {
    if (mode === 'explore') {
      if (tiles.length) cue('slide')
      return setTiles([])
    }
    if (!run || !item || run.phase !== 'ask') return
    cue('slide')
    setRun({ ...run, fills: blank(item), active: 0 })
  }

  // ── the run ──

  const prompt = (it?: Item) => {
    if (it) void say(SAY[it.skill])
  }

  const startRun = () => {
    const r = begin(mine, Date.now() % 1_000_000_007)
    setRun(r)
    prompt(r.queue[0])
  }

  const carryOn = (was: Run) => {
    const queue = advanceQueue(was.queue, was.dirty)
    if (!queue.length) {
      setRun({ ...was, queue, fills: [[]], active: 0, phase: 'done' })
      if (was.clean) {
        sfx('celebrate')
        void say(SAY.clean)
        onStar()
      } else void say(SAY.again)
      return
    }
    // The kind of item is said when it changes.
    if (queue[0].skill !== was.queue[0].skill) prompt(queue[0])
    setRun({ ...was, queue, fills: blank(queue[0]), active: 0, dirty: false, phase: 'ask' })
  }

  const submit = () => {
    if (!run || !item || run.phase !== 'ask' || !ready(item, run.fills)) return
    const result = (correct: boolean) => record(services.shared, { stream: 'bench', stage, item: item.id, correct, skill: item.skill })
    window.clearTimeout(timer.current)
    if (check(item, run.fills)) {
      sfx('correct')
      // Right first time: it leaves the run. (Right after a miss, it comes back to be answered again.)
      if (!run.dirty) result(true)
      const was: Run = { ...run, phase: 'right' }
      setRun(was)
      timer.current = window.setTimeout(() => carryOn(was), RIGHT_MS)
    } else {
      sfx('wrong')
      if (!run.dirty) result(false)
      setRun({ ...run, dirty: true, clean: false, phase: 'miss' })
      timer.current = window.setTimeout(() => setRun((r) => (r && r.phase === 'miss' ? { ...r, phase: 'ask' } : r)), LOCKOUT_MS)
    }
  }

  const go = (m: Mode) => {
    if (m === mode || busy) return
    if (m === 'mastery') {
      if (!open) return
      if (!run || run.phase === 'done') startRun()
      else prompt(run.queue[0])
    }
    setMode(m)
  }

  // ── drawing ──

  const want = item?.skill === 'make' && run ? item.wants[run.active] : null
  const tileOn = (g: string) => !!asking && (want === null || (want === 'sign') === !isDigit(g))
  const marks = item?.skill === 'make' && run && run.phase !== 'right' ? spans(view.toks, view.size) : []
  const left = run ? run.queue.length : 0
  const row1 = MID - (12 * STEP + 28 - 8) / 2 + TILE_W / 2
  const row2 = MID - (mine.length * STEP - 8) / 2 + TILE_W / 2
  const done = mode === 'mastery' && run?.phase === 'done'

  return (
    <div className="h-dvh w-full relative overflow-hidden select-none" style={{ background: PAPER, touchAction: 'none' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ aspectRatio: '16 / 9', width: 'min(100vw, calc(100dvh * 16 / 9))' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: 'block' }}>
            <rect width={W} height={H} fill={PAPER} />
            {/* The bench top: the balance stands on it, the tiles lie under it. */}
            <rect x={90} y={850} width={W - 180} height={5} rx={2.5} fill={EDGE} />

            <Sprites list={shown.filter((s) => !onLine(s))} />

            {/* The line (it shakes at a miss), and under each gap a rule: gold where his next tile goes. */}
            <g key={run?.phase === 'miss' ? 'miss' : 'line'} className={mode === 'mastery' && run?.phase === 'miss' ? 'bench-shake' : undefined}>
              <Sprites list={shown.filter(onLine)} />
              {marks.map((m) => {
                const active = run?.active === m.gap
                const w = Math.max(m.x1 - m.x0, 88)
                return (
                  <g key={m.gap} onPointerDown={() => run && run.phase === 'ask' && setRun({ ...run, active: m.gap })} style={{ cursor: 'pointer' }} role="button" aria-label={`Gap ${m.gap + 1}`}>
                    <rect x={(m.x0 + m.x1) / 2 - w / 2 - 10} y={LINE_Y - view.size * 0.62} width={w + 20} height={view.size * 1.34} fill="transparent" />
                    <rect x={m.x0} y={LINE_Y + view.size * 0.56} width={m.x1 - m.x0} height={9} rx={4.5} fill={active ? GOLD : EDGE} />
                  </g>
                )
              })}
            </g>

            {/* The run is over: the star, or another go at it. */}
            {done && run && (
              <g onPointerDown={startRun} style={{ cursor: 'pointer' }} role="button" aria-label={SAY.again}>
                <rect x={MID - 560} y={LINE_Y - 110} width={1120} height={220} fill="transparent" />
                {run.clean ? (
                  <g className="bench-rise">
                    <Star x={MID} y={LINE_Y} r={104} won />
                  </g>
                ) : (
                  <>
                    <Star x={MID - 410} y={LINE_Y} r={62} won={false} />
                    <text x={MID - 20} y={LINE_Y} {...words(58)}>
                      {SAY.again}
                    </text>
                  </>
                )}
                <g transform={`translate(${MID + (run.clean ? 240 : 400)} ${LINE_Y})`} opacity={run.clean ? 0.45 : 1}>
                  <circle r={50} fill={CARD} stroke={EDGE} strokeWidth={3} />
                  <AgainGlyph />
                </g>
              </g>
            )}

            {/* Mastery: how far through the run, and what is asked (a tap says it again). */}
            {mode === 'mastery' && run && (
              <>
                {Array.from({ length: 8 }, (_, i) => (
                  <rect key={i} x={150 + i * 40} y={46} width={28} height={28} rx={6} fill={i < 8 - left ? GOLD : 'none'} stroke={i < 8 - left ? GOLD_EDGE : SOFT} strokeWidth={2.5} opacity={i < 8 - left ? 1 : 0.5} />
                ))}
                {item && (
                  <g onPointerDown={() => prompt(item)} style={{ cursor: 'pointer' }} role="button" aria-label={`Say it again: ${SAY[item.skill]}`}>
                    <rect x={MID - 260} y={16} width={520} height={88} fill="transparent" />
                    <text x={MID} y={60} {...words(40)} opacity={0.6}>
                      {SAY[item.skill]}
                    </text>
                  </g>
                )}
              </>
            )}

            {/* Explore, or the Mastery run (locked until the stage's explainers are watched). */}
            <Tile x={1512} y={60} w={236} h={88} gold={mode === 'explore'} label="Explore" onTap={() => go('explore')}>
              <text {...words(38)}>Explore</text>
            </Tile>
            <Tile x={1764} y={60} w={252} h={88} on={open} gold={mode === 'mastery'} label={open ? 'Mastery' : 'Mastery (not yet)'} onTap={() => go('mastery')}>
              {!open && <Padlock x={-96} y={-4} />}
              {open && <Star x={-94} y={0} r={19} won={starred} />}
              <text x={18} {...words(38)}>
                Mastery
              </text>
            </Tile>

            {/* Check the line. */}
            {item && run && (
              <g className={ready(item, run.fills) && run.phase === 'ask' ? 'bench-rise' : undefined}>
                <Tile x={1790} y={600} w={156} h={156} on={run.phase === 'ask' && ready(item, run.fills)} gold label="Check" onTap={submit}>
                  <path d="M -34 4 L -10 28 L 36 -26" {...stroke} stroke={GOLD_EDGE} strokeWidth={13} />
                </Tile>
              </g>
            )}

            {/* The palette: the digits, take one back, clear the line; then his signs. */}
            {DIGITS.map((g, i) => (
              <Tile key={g} x={row1 + i * STEP} y={ROW_1} w={TILE_W} on={tileOn(g)} label={g} onTap={() => put(g)}>
                <Token it={items([g])[0]} x={0} y={2} size={62} />
              </Tile>
            ))}
            <Tile x={row1 + 10 * STEP + 28} y={ROW_1} w={TILE_W} on={!!asking} label="Take one back" onTap={takeBack}>
              <BackGlyph />
            </Tile>
            <Tile x={row1 + 11 * STEP + 28} y={ROW_1} w={TILE_W} on={!!asking} label="Clear the line" onTap={clear}>
              <text {...words(54)} y={2}>
                C
              </text>
            </Tile>
            {mine.map((g, i) => (
              <Tile key={g} x={row2 + i * STEP} y={ROW_2} w={TILE_W} on={tileOn(g)} label={g} onTap={() => put(g)}>
                <Token it={items([g])[0]} x={0} y={0} size={62} />
              </Tile>
            ))}
          </svg>
        </div>
      </div>
      <style>{`
        .bench-tile:active .bench-face { fill: #efe3c8 }
        @keyframes bench-shake { 0%, 100% { transform: none } 15% { transform: translateX(-16px) } 35% { transform: translateX(14px) } 55% { transform: translateX(-10px) } 75% { transform: translateX(6px) } }
        .bench-shake { animation: bench-shake 460ms ease-in-out }
        @keyframes bench-rise { from { opacity: 0 } to { opacity: 1 } }
        .bench-rise { animation: bench-rise 400ms ease-out }
      `}</style>
      {/* The way out, faint in the corner (and Android back). */}
      <button type="button" onClick={onBack} className="absolute top-3 left-3 w-14 h-14 rounded-full text-3xl font-bold opacity-30 active:opacity-70" style={{ color: INK }} aria-label="Back">
        ←
      </button>
    </div>
  )
}
