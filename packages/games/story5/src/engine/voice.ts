/**
 * The narration: one pre-generated clip per line, listed in voice.json
 * (written by scripts/voice.mjs). Like the cue tones, a clip is placed on an
 * audio context (live or offline) from t, so the player and the export
 * speak at the same moments.
 */
import CLIPS from '../voice.json'

export const VOICE_DIR = '/games/story5/voice/'
const LEVEL = 0.9

export interface Clip {
  file: string
  dur: number
}

export function clip(say: string): Clip | undefined {
  return (CLIPS as Record<string, Clip>)[say]
}

/** Fetch and decode the clips for these lines (missing ones are left out). */
export async function loadClips(ctx: BaseAudioContext, says: string[], base = VOICE_DIR): Promise<Map<string, AudioBuffer>> {
  const out = new Map<string, AudioBuffer>()
  await Promise.all(
    [...new Set(says)].map(async (say) => {
      const c = clip(say)
      if (!c) return
      try {
        const res = await fetch(base + c.file)
        out.set(say, await ctx.decodeAudioData(await res.arrayBuffer()))
      } catch {
        // no clip: the caption still shows
      }
    }),
  )
  return out
}

/** Speak a clip at context time `at`, starting `offset` seconds into it. */
export function speak(ctx: BaseAudioContext, buf: AudioBuffer, at: number, offset = 0, out: AudioNode = ctx.destination): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  g.gain.value = LEVEL
  src.buffer = buf
  src.connect(g).connect(out)
  src.start(at, offset)
  return src
}

/** Speak one line now, on a context of its own (the workshop's prompts). */
let live: { ctx: AudioContext; src: AudioBufferSourceNode | null; bufs: Map<string, AudioBuffer> } | null = null
export async function say(line: string) {
  try {
    live ??= { ctx: new AudioContext(), src: null, bufs: new Map() }
    const l = live
    if (l.ctx.state === 'suspended') void l.ctx.resume()
    if (!l.bufs.has(line)) for (const [k, v] of await loadClips(l.ctx, [line])) l.bufs.set(k, v)
    const buf = l.bufs.get(line)
    if (!buf) return
    try {
      l.src?.stop()
    } catch {
      // already done
    }
    l.src = speak(l.ctx, buf, l.ctx.currentTime + 0.05)
  } catch {
    // no sound
  }
}
