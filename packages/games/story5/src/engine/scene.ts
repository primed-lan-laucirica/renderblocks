import type { ComponentType, ReactNode } from 'react'
import type { Pt } from './ease'

/**
 * The scene contract: an episode is a component that draws a pure function
 * of t (seconds), at 1920 × 1080, plus its duration and the sound cues on
 * its timeline. Any frame can be drawn in any order, so the player can
 * scrub, pause and resume, and the export can render to video.
 */
export const W = 1920
export const H = 1080

export interface SceneEvent {
  time: number
  kind: CueKind
  n: number
}

export type CueKind = 'pebble' | 'notch' | 'card' | 'zero' | 'place' | 'digit' | 'bead' | 'fuse' | 'break' | 'tile' | 'piece' | 'slide' | 'equals'

/**
 * An interactive beat: playback stops at `time` and the child performs the
 * action; then it carries on from `resume` (skipping the scene's own
 * demonstration of that action, which plays when watched straight through
 * or exported).
 *
 * 'drag' (the default): drag each piece into a free slot (any order).
 * 'tap': tap each piece (break a bar, pick the longer rod); `slots` is unused.
 */
export interface Beat {
  id: string
  time: number
  resume: number
  action?: 'drag' | 'tap'
  /** The child's pieces, where they start (each piece's drawing origin). */
  pieces: Pt[]
  slots: Pt[]
  /**
   * How each piece is drawn: the built-in bead, quarter or stamp tile, or
   * 'custom' with `draw`.
   */
  piece: 'bead' | 'quarter' | 'tile' | 'custom'
  /** Custom pieces: draw piece i at `at`; `done` once it's in a slot (or tapped). */
  draw?: (at: Pt, i: number, done: boolean) => ReactNode
  /** Custom slots: the empty slot's outline (default: none). */
  drawSlot?: (at: Pt, k: number) => ReactNode
  /** Custom pieces: from a piece's origin to its middle (for touch and snapping). */
  centre?: Pt
  /** Custom pieces: touch radius and snap distance, in scene pixels (default 50 and 70). */
  reach?: number
  snap?: number
  /** Custom pieces: several pieces may share one slot (quarters into one circle). */
  stack?: boolean
  /** The prompt shown while waiting (a few words). */
  prompt: string
  /** The prompt spoken (narrated when the beat begins, and on a tap). */
  say: string
}

/**
 * A narrated line: `say` is spoken at `time`. It's the spoken form of key
 * text on screen (numbers in words, "3/4" as "three quarters"); the clip
 * for each line is generated ahead of time (scripts/voice.mjs) and listed
 * in voice.json.
 */
export interface VoiceLine {
  time: number
  say: string
}

export interface SceneDef {
  id: string
  /** Episode number in the series (0 = the Story of Numbers). */
  number: number
  title: string
  duration: number
  events: SceneEvent[]
  beats: Beat[]
  /** The narration, in time order. */
  voice: VoiceLine[]
  /** Drawn as SVG (or, for the ported Episode 0, canvas). */
  render: 'svg' | 'canvas'
  /**
   * `beat`: the id of the beat the child is doing right now. The scene
   * leaves that beat's pieces out (the child is moving their own copies).
   */
  Scene: ComponentType<{ t: number; beat?: string }>
}
