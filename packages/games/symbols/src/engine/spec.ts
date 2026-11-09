/**
 * An explainer's spec: the acts as a list of steps. A step changes what is
 * on the stage (show, write, move), may say one line, and may hand over to
 * him (a turn). compile() lays the steps on t from the lengths of the
 * voiced lines, and the result is an ordinary scene.
 */
import type { ReactNode } from 'react'
import type { CueKind } from '@renderblocks/scene/scene'
import type { Tok } from '../kit/glyphs'
import type { Sprite } from '../kit/sprites'

/** The stage is a set of named actors, each a list of sprites; a patch sets some of them (null takes one off). */
export type Patch = Record<string, Sprite[] | null>

interface TurnBase {
  /** Its name in the evidence ("r01:same"). */
  id: string
  /** The few words shown while he does it (the step's `say` is what is spoken). */
  prompt: string
}

/** Tap one of two before the scene shows which. Either carries on; the next step shows the answer. */
export interface PredictTurn extends TurnBase {
  kind: 'predict'
  options: [PredictOption, PredictOption]
}
export interface PredictOption {
  label: string
  /** A small picture on the button, drawn about (0, 0), 120 wide. */
  icon?: () => ReactNode
}

/** Tap the true card. A wrong one shakes, locks for a moment and the cards change places. */
export interface ChooseTurn extends TurnBase {
  kind: 'choose'
  cards: Tok[][]
  right: number
  /** Beads under each numeral, so the amounts can be checked by eye. */
  under?: boolean
  /** The actor the true card's line becomes (default "line"). */
  actor?: string
}

/** The statement is shown in silence; he reads it, then the voice does (a tap says it at once). */
export interface ReadTurn extends TurnBase {
  kind: 'read'
}

/** Drag the right sign into the gap ("_") of a line. */
export interface PlaceTurn extends TurnBase {
  kind: 'place'
  toks: Tok[]
  tiles: string[]
  right: string
  /** Where the line sits, and how big (default: the middle of the paper). */
  y?: number
  size?: number
  under?: boolean
  /** The actor the finished line becomes (default "line"). */
  actor?: string
}

/** Move beads until the statement is true: `state(n)` is the stage with n of them on. */
export interface BuildTurn extends TurnBase {
  kind: 'build'
  target: number
  /** The most he can put on (default target + 4). */
  max?: number
  state: (n: number) => Patch
  /** Where beads are dropped (and picked off again), in scene pixels. */
  zone: { x: number; y: number; w: number; h: number }
  /** How many beads one move brings (a row of three, one for each plate); default 1. */
  unit?: number
  /** "empty": the tray is drawn bare, and `state` puts what is left on it. */
  supply?: 'beads' | 'empty'
}

export type Turn = PredictTurn | ChooseTurn | ReadTurn | PlaceTurn | BuildTurn

export interface Step {
  /** This step opens an act (1 the need, 2 what the sign does, 3 where it is used, 4 his turn). History is a passing line at most. */
  act?: 1 | 2 | 3 | 4
  /** The line spoken (narration is voice only; the paper is kept for objects and notation). */
  say?: string
  /** Seconds of silence before the line: the sign is seen before it is named. */
  quiet?: number
  /** Seconds held after the line (default a short beat). */
  pad?: number
  /** Seconds the stage takes to move to this step's state (default 0.9). */
  move?: number
  /** Take everything off first (or everything but the actors named). */
  clear?: boolean | string[]
  stage?: Patch
  /** More changes during the step, `at` seconds after it starts. */
  also?: { at: number; stage: Patch; move?: number; cue?: CueKind }[]
  /** A sound as the step starts. */
  cue?: CueKind
  /** The naming motif: the same three notes every time a sign is first named. */
  motif?: boolean
  /** The closing question: it may show the next rank's sign. */
  teaser?: boolean
  /** The frame the road's window shows (as this step ends). */
  poster?: boolean
  turn?: Turn
}

export interface Spec {
  rank: number
  /** "r01" */
  id: string
  title: string
  /** Actors that must be drawn under the rest, bottom first (otherwise an actor is drawn over those that came on before it). */
  layers?: string[]
  steps: Step[]
}
