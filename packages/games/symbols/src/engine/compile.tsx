/**
 * compile(spec, clips): a spec's steps laid on t. Each step starts when the
 * one before has finished speaking (and moving) plus a short beat, so the
 * timing follows the voice and nothing waits in silence unless the step
 * asks for it. The result is an ordinary scene (a pure function of t, with
 * its cues, narration and beats) that the shared player and the export run
 * unchanged, plus what the tile and the tests need to know about it.
 */
import type { Beat, SceneDef, SceneEvent, VoiceLine } from '@renderblocks/scene/scene'
import { H, W } from '@renderblocks/scene/scene'
import { p, smooth } from '@renderblocks/scene/ease'
import type { Clip } from '@renderblocks/scene/voice'
import { PAPER } from '../kit/look'
import { between, same, Sprites, type Sprite } from '../kit/sprites'
import type { Patch, Spec, Turn } from './spec'
import { chooseSprites, chosenLine, PlaceView, placeLine, PredictView, SupplyView } from './turns'

/** A turn, placed on t. */
export interface TurnAt {
  turn: Turn
  /** The clock stops here for him. */
  time: number
  /** Watched straight through, the scene shows the answer from here… */
  demoAt: number
  /** …and carries on from here (where his own turn picks up, too). */
  resume: number
  /** The actors his own copy replaces while he builds. */
  actors: string[]
}

export interface Explainer extends SceneDef {
  rank: number
  spec: Spec
  turns: TurnAt[]
  /** The frame the road's window shows. */
  poster: number
  acts: { act: number; time: number }[]
  /** Silences that are meant: a sign seen before it is named, a turn's thinking time. */
  waits: [number, number][]
  /** Every sign put on the paper, and whether the closing question's licence covers it. */
  signs: { g: string; t: number; teaser: boolean }[]
  /** When each step has finished speaking and moving: the frames worth looking at. */
  ends: number[]
  /** Lines that have no clip yet (their lengths are guessed). */
  unvoiced: string[]
  /** The stage at t; `hide` leaves some actors out. */
  frame: (t: number, hide?: string[]) => Sprite[]
}

const MOVE = 0.9
const PAD = 0.9
const LEAD = 0.5
const TAIL = 1.4
/** A turn watched straight through: time to think, then the answer. */
const THINK = { predict: 2.0, choose: 1.6, place: 1.4, build: 1.0 }
const BEAD_EVERY = 0.5

/** A line's length before it has a clip: roughly how the house voice paces. */
export const guess = (say: string) => 0.5 + say.split(/\s+/).length * 0.37

interface KF {
  t: number
  move: number
  s: Sprite | null
}
interface Track {
  key: string
  actor: string
  order: number
  kfs: KF[]
}

/** A patch as one list of sprites, each named with its actor. */
export const flat = (patch: Patch): Sprite[] => Object.entries(patch).flatMap(([actor, list]) => (list ?? []).map((s) => ({ ...s, k: `${actor}/${s.k}` })))

/** Two lists of sprites, k of the way from one to the other (matched by name). */
export function blendLists(a: Sprite[], b: Sprite[], k: number): Sprite[] {
  const from = new Map(a.map((s) => [s.k, s]))
  const seen = new Set(b.map((s) => s.k))
  return [...a.filter((s) => !seen.has(s.k)).flatMap((s) => between(s, null, k)), ...b.flatMap((s) => between(from.get(s.k) ?? null, s, k))]
}

const signsIn = (list: Sprite[]) => list.flatMap((s) => (s.type === 'tok' && s.d.it && (s.d.it.kind === 'sign' || s.d.it.kind === 'frac') ? [s.d.it.g] : []))

export function compile(spec: Spec, clips: Record<string, Clip>): Explainer {
  const tracks = new Map<string, Track>()
  const actors: string[] = [...(spec.layers ?? [])]
  const live = new Map<string, Map<string, Sprite>>()
  const events: SceneEvent[] = []
  const voice: VoiceLine[] = []
  const beats: Beat[] = []
  const turns: TurnAt[] = []
  const acts: Explainer['acts'] = []
  const waits: [number, number][] = []
  const signs: Explainer['signs'] = []
  const unvoiced: string[] = []
  const ends: number[] = []
  let poster = 0

  const length = (say: string) => {
    const c = clips[say]
    if (!c) unvoiced.push(say)
    return c?.dur ?? guess(say)
  }

  const apply = (patch: Patch, t: number, move: number, teaser: boolean) => {
    for (const [actor, list] of Object.entries(patch)) {
      if (!actors.includes(actor)) actors.push(actor)
      const now = live.get(actor) ?? new Map<string, Sprite>()
      const next = new Map<string, Sprite>()
      const put = (key: string, s: Sprite | null, order: number) => {
        let tr = tracks.get(key)
        if (!tr) tracks.set(key, (tr = { key, actor, order, kfs: [] }))
        const last = tr.kfs[tr.kfs.length - 1]
        if (last && t < last.t + last.move - 1e-6) throw new Error(`${spec.id}: "${key}" is still moving at ${t.toFixed(2)} s (it started at ${last.t.toFixed(2)})`)
        tr.kfs.push({ t, move, s })
      }
      ;(list ?? []).forEach((s, i) => {
        const key = `${actor}/${s.k}`
        if (next.has(key)) throw new Error(`${spec.id}: two sprites named "${key}"`)
        next.set(key, s)
        if (!same(now.get(key) ?? null, s)) put(key, s, actors.indexOf(actor) * 10000 + i)
      })
      for (const key of now.keys()) if (!next.has(key)) put(key, null, 0)
      live.set(actor, next)
      for (const g of signsIn(list ?? [])) signs.push({ g, t, teaser })
    }
  }

  let t = LEAD
  spec.steps.forEach((step, si) => {
    const t0 = t
    if (step.act) acts.push({ act: step.act, time: t0 })
    const teaser = !!step.teaser
    const turn = step.turn
    const patch: Patch = {}
    if (step.clear) for (const a of live.keys()) if (!(Array.isArray(step.clear) && step.clear.includes(a))) patch[a] = null
    Object.assign(patch, step.stage, turn?.kind === 'build' ? turn.state(0) : undefined)
    const moves = Object.keys(patch).length > 0
    const move = moves ? (step.move ?? MOVE) : 0
    apply(patch, t0, move, teaser)
    if (step.cue) events.push({ time: t0, kind: step.cue, n: si })
    let end = t0 + move
    for (const a of step.also ?? []) {
      const m = a.move ?? MOVE
      apply(a.stage, t0 + a.at, m, teaser)
      if (a.cue) events.push({ time: t0 + a.at, kind: a.cue, n: si })
      end = Math.max(end, t0 + a.at + m)
    }
    const dur = step.say ? length(step.say) : 0

    if (turn) {
      if (!step.say) throw new Error(`${spec.id}: turn "${turn.id}" has nothing to say`)
      const time = end + 0.2
      let resume: number
      let demoAt: number
      if (turn.kind === 'read') {
        // Seen in silence, then read aloud: the reading is the line after the turn.
        resume = demoAt = time + (step.quiet ?? 2)
        voice.push({ time: resume, say: step.say })
        waits.push([time, resume])
        end = resume + dur
      } else {
        voice.push({ time, say: step.say })
        demoAt = time + dur + THINK[turn.kind]
        if (turn.kind === 'predict') resume = demoAt + 0.4
        else if (turn.kind === 'choose') {
          resume = demoAt + 1.2
          apply({ [turn.actor ?? 'line']: chosenLine(turn) }, resume, 0, teaser)
        } else if (turn.kind === 'place') {
          resume = demoAt + 1.5
          apply({ [turn.actor ?? 'line']: placeLine(turn, true) }, resume, 0, teaser)
        } else {
          for (let n = 1; n <= turn.target; n++) {
            apply(turn.state(n), demoAt + (n - 1) * BEAD_EVERY, 0.4, teaser)
            events.push({ time: demoAt + (n - 1) * BEAD_EVERY + 0.35, kind: 'bead', n: n - 1 })
          }
          resume = demoAt + turn.target * BEAD_EVERY + 0.7
        }
        waits.push([time + dur, resume])
        end = resume
        if (turn.kind === 'choose') for (const c of turn.cards) for (const g of signsIn(chooseSprites({ ...turn, cards: [c], right: 0 }, [0]).flat())) signs.push({ g, t: time, teaser })
        if (turn.kind === 'place') for (const g of [...signsIn(placeLine(turn)), ...turn.tiles]) signs.push({ g: g === 'frac' ? 'frac' : g, t: time, teaser })
      }
      beats.push({ id: turn.id, time, resume, action: 'tap', pieces: [], slots: [], piece: 'custom', prompt: turn.prompt, say: turn.kind === 'read' ? '' : step.say })
      turns.push({ turn, time, demoAt, resume, actors: turn.kind === 'build' ? Object.keys(turn.state(0)) : [] })
    } else if (step.say) {
      const at = t0 + (step.quiet ?? 0)
      voice.push({ time: at, say: step.say })
      if (step.quiet) waits.push([t0, at])
      if (step.motif) events.push({ time: at, kind: 'equals', n: 0 })
      end = Math.max(end, at + dur)
    } else if (step.motif) events.push({ time: t0, kind: 'equals', n: 0 })

    if (step.poster) poster = end
    ends.push(end)
    t = end + (step.pad ?? PAD)
    if ((step.pad ?? 0) > 1) waits.push([end, t])
  })
  const duration = t - PAD + TAIL

  const sorted = [...tracks.values()].sort((a, b) => a.order - b.order)
  const frame = (at: number, hide?: string[]): Sprite[] => {
    const out: Sprite[] = []
    for (const tr of sorted) {
      const kfs = tr.kfs
      if (at < kfs[0].t || hide?.includes(tr.actor)) continue
      let i = kfs.length - 1
      while (kfs[i].t > at) i--
      const kf = kfs[i]
      const k = kf.move > 0 ? smooth(p(at, kf.t, kf.t + kf.move)) : 1
      if (k >= 1) {
        if (kf.s) out.push({ ...kf.s, k: tr.key })
      } else for (const s of between(i > 0 ? kfs[i - 1].s : null, kf.s, k)) out.push({ ...s, k: tr.key })
    }
    return out
  }

  function Scene({ t: at, beat }: { t: number; beat?: string }) {
    const mine = beat ? turns.find((x) => x.turn.id === beat) : undefined
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: 'block' }}>
        <rect width={W} height={H} fill={PAPER} />
        {/* A build turn's tray lies under everything, so what is left can sit on it. */}
        {turns.map((x) => (x.turn.kind === 'build' && x !== mine && at >= x.time && at < x.resume ? <SupplyView key={x.turn.id} o={p(at, x.time, x.time + 0.3)} unit={x.turn.unit} empty={x.turn.supply === 'empty'} /> : null))}
        <Sprites list={frame(at, mine?.actors)} />
        {turns.map((x) => {
          // His own turn is drawn by the overlay; watched straight through, the scene shows it and then the answer.
          if (x === mine || at < x.time || at >= x.resume) return null
          const o = p(at, x.time, x.time + 0.3)
          const { turn } = x
          if (turn.kind === 'predict') return <PredictView key={turn.id} turn={turn} o={o} />
          if (turn.kind === 'choose')
            return (
              <g key={turn.id} opacity={o}>
                <Sprites list={chooseSprites(turn, turn.cards.map((_, i) => i), at >= x.demoAt ? turn.right : -1).flat()} />
              </g>
            )
          if (turn.kind === 'place') return <PlaceView key={turn.id} turn={turn} k={smooth(p(at, x.demoAt, x.demoAt + 0.8))} o={o} />
          return null
        })}
      </svg>
    )
  }

  return { id: spec.id, number: spec.rank, title: spec.title, duration, events, beats, voice, render: 'svg', Scene, rank: spec.rank, spec, turns, poster, acts, waits, signs, unvoiced, ends, frame }
}
