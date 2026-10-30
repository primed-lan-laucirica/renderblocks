/**
 * Narration: one pre-generated clip per line, listed in an app's own clip
 * list (written by its voice script). Like the cue tones, a clip is placed
 * on an audio context (live or offline) from t, so a player and an export
 * speak at the same moments.
 */
const LEVEL = 0.9

export interface Clip {
  file: string
  dur: number
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

export interface VoiceBank {
  clip: (say: string) => Clip | undefined
  /** Fetch and decode the clips for these lines (missing ones are left out). */
  loadClips: (ctx: BaseAudioContext, says: string[], base?: string) => Promise<Map<string, AudioBuffer>>
  /** Speak one line now, on a context of its own (prompts outside a scene). */
  say: (line: string) => Promise<void>
}

/** An app's narration: its clip list and the folder the clips are served from. */
export function createVoice(clips: Record<string, Clip>, dir: string): VoiceBank {
  const clip = (say: string) => clips[say]

  const loadClips = async (ctx: BaseAudioContext, says: string[], base = dir) => {
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

  let live: { ctx: AudioContext; src: AudioBufferSourceNode | null; bufs: Map<string, AudioBuffer> } | null = null
  const say = async (line: string) => {
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

  return { clip, loadClips, say }
}
