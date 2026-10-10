import type { ComponentType } from 'react'
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
 */
export interface Beat {
  id: string
  time: number
  resume: number
  /** What the child does: drag these pieces into these slots. */
  pieces: Pt[]
  slots: Pt[]
  /** How each piece is drawn while it's dragged. */
  piece: 'bead' | 'quarter' | 'tile'
  /** The prompt shown while waiting (a few words). */
  prompt: string
}

export interface SceneDef {
  id: string
  /** Episode number in the series (0 = the Story of Numbers). */
  number: number
  title: string
  duration: number
  events: SceneEvent[]
  beats: Beat[]
  /** Drawn as SVG (or, for the ported Episode 0, canvas). */
  render: 'svg' | 'canvas'
  /**
   * `beat`: the id of the beat the child is doing right now. The scene
   * leaves that beat's pieces out (the child is moving their own copies).
   */
  Scene: ComponentType<{ t: number; beat?: string }>
}
