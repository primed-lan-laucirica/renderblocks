/**
 * The Words app plays one thing: a word, said whole and clearly (tap the
 * word). Sounding it out is his job — the slider only lights the parts.
 */
const WORDS = '/games/words/audio'

let ctx: AudioContext | null = null
const buffers = new Map<string, Promise<AudioBuffer | null>>()
const playing = new Set<AudioBufferSourceNode>()

function context(): AudioContext {
  ctx ??= new AudioContext()
  return ctx
}

/** Call from a touch: browsers only start audio after a user gesture. */
export function unlockAudio(): void {
  const c = context()
  if (c.state === 'suspended') void c.resume()
}

function load(word: string): Promise<AudioBuffer | null> {
  let p = buffers.get(word)
  if (!p) {
    p = fetch(`${WORDS}/${word}.mp3`)
      .then((r) => r.arrayBuffer())
      .then((data) => context().decodeAudioData(data))
      .catch(() => null)
    buffers.set(word, p)
  }
  return p
}

/** Fetch and decode a word's recording ahead of use. */
export function preload(word: string): void {
  void load(word)
}

/** Say the word. A new word cuts off one still playing. */
export function playWord(word: string): void {
  stopAll()
  const c = context()
  void load(word).then((buf) => {
    if (!buf || c.state !== 'running') return
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.onended = () => playing.delete(src)
    playing.add(src)
    src.start()
  })
}

export function stopAll(): void {
  for (const src of playing) {
    try {
      src.stop()
    } catch {
      // Already stopped.
    }
  }
  playing.clear()
}
