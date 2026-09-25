/**
 * Choosing a falling block's scream so it lasts the whole fall. Pure — the
 * clip list comes from /games/lava/voice/index.json (real durations,
 * written by tools/audio/verify.mjs) — so it is unit tested directly.
 */

export interface ScreamClip {
  name: string
  /** "aah", "noo", "wait" … — rotated so consecutive falls sound different. */
  type: string
  /** Real length at normal speed. */
  seconds: number
}

export interface ScreamChoice {
  name: string
  rate: number
}

/** A scream may be sped up or slowed by this much to land exactly on the lava. */
const FIT = 0.15
/** Ends just after impact, so the sizzle cuts it rather than it trailing off early. */
const TAIL_S = 0.15
const MIN_RATE = 0.55

/**
 * Time for a block to fall from height `y` (moving at `vy`, up positive) to
 * the lava at `lavaY` under gravity `g`: solves y + vy·t − ½gt² = lavaY.
 */
export function fallSeconds(y: number, vy: number, lavaY: number, g: number): number {
  const d = Math.max(0, y - lavaY)
  return (vy + Math.sqrt(vy * vy + 2 * g * d)) / g
}

/**
 * Pick the scream for a fall of `fall` seconds, played at `pitch` (the
 * block's size-based playback rate; playing at rate r makes a clip last
 * seconds / r). Prefers type `types[turn % n]`, falling through the rotation
 * to the first type that has a clip long enough; picks that type's shortest
 * such clip, then nudges the rate (±15%) so it ends right at the lava.
 * If no clip is long enough, the longest one is slowed down (deeper) instead.
 */
export function pickScream(clips: ScreamClip[], fall: number, pitch: number, turn: number): ScreamChoice | null {
  if (clips.length === 0) return null
  const want = fall + TAIL_S
  const types = [...new Set(clips.map((c) => c.type))]
  for (let i = 0; i < types.length; i++) {
    const type = types[(turn + i) % types.length]
    const fits = clips
      .filter((c) => c.type === type && c.seconds / (pitch * (1 - FIT)) >= want)
      .sort((a, b) => a.seconds - b.seconds)
    if (fits.length) {
      const c = fits[0]
      const exact = c.seconds / want
      return { name: c.name, rate: Math.min(pitch * (1 + FIT), Math.max(pitch * (1 - FIT), exact)) }
    }
  }
  const longest = clips.reduce((a, b) => (b.seconds > a.seconds ? b : a))
  return { name: longest.name, rate: Math.max(MIN_RATE, Math.min(pitch, longest.seconds / want)) }
}
