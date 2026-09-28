/**
 * The Words app plays a word, said whole and clearly (tap the word), and a
 * sentence using it (tap the 💬 card). Sounding it out is his job — the
 * slider only lights the parts.
 */
const WORDS = '/games/words/audio'
const SENTENCES = '/games/words/sentences'

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

function load(word: string, dir = WORDS): Promise<AudioBuffer | null> {
  const url = `${dir}/${word}.mp3`
  let p = buffers.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => context().decodeAudioData(data))
      .catch(() => null)
    buffers.set(url, p)
  }
  return p
}

/** Fetch and decode a word's recording ahead of use. */
export function preload(word: string): void {
  void load(word)
}

/** Say the word. A new word cuts off one still playing. */
export function playWord(word: string): void {
  play(load(word))
}

/** When the sentence now playing started (AudioContext time), and how long it is. */
let sentence: { at: number; duration: number } | null = null

/** Read a sentence aloud (its clip name, e.g. "fin-1"). */
export function playSentence(name: string): void {
  play(load(name, SENTENCES), (at, duration) => (sentence = { at, duration }))
}

/** Seconds into the sentence being read, or null when none is. */
export function sentenceTime(): number | null {
  if (!sentence || !ctx) return null
  const t = ctx.currentTime - sentence.at
  return t >= 0 && t <= sentence.duration ? t : null
}

function play(clip: Promise<AudioBuffer | null>, started?: (at: number, duration: number) => void): void {
  stopAll()
  const c = context()
  void clip.then((buf) => {
    if (!buf || c.state !== 'running') return
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.onended = () => playing.delete(src)
    playing.add(src)
    src.start()
    started?.(c.currentTime, buf.duration)
  })
}

export function stopAll(): void {
  sentence = null
  for (const src of playing) {
    try {
      src.stop()
    } catch {
      // Already stopped.
    }
  }
  playing.clear()
}
