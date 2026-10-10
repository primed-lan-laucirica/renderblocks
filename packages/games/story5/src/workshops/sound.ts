/** Workshop sounds: the episodes' cue tones for exchanges, the shared chime/thunk/fanfare for answers. */
import type { CueKind } from '../engine/scene'
import { play as playCue } from '../engine/tones'

let ctx: AudioContext | null = null

/** One of the episodes' cue tones, now (a fuse or break the child just made, a piece placed). */
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
