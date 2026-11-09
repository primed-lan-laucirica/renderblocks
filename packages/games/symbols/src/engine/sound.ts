/** Sounds outside an explainer's own clock: a turn's bead, a card chosen, the app-wide answer sounds. */
import type { CueKind } from '@renderblocks/scene/scene'
import { play as playCue } from '@renderblocks/scene/tones'

let ctx: AudioContext | null = null

/** One of the scenes' cue tones, now. */
export function cue(kind: CueKind, n = 0) {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    playCue(ctx, { time: 0, kind, n }, ctx.currentTime + 0.02)
  } catch {
    // no sound
  }
}

/** The app-wide answer sounds. */
export function sfx(name: 'correct' | 'wrong' | 'celebrate') {
  const a = new Audio(`/games/shared/sfx/${name}.mp3`)
  a.volume = 0.7
  void a.play().catch(() => {})
}
