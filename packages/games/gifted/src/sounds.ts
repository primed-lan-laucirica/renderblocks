/**
 * All audio is pre-generated (tools/audio/generate.mjs) and shipped as files —
 * the app never calls a speech API at runtime.
 */
type Sfx = 'correct' | 'wrong' | 'celebrate' | 'pop' | 'whoosh'
/** Spoken lines live in /games/gifted/voice/. */
export type Voice =
  | 'figureClassify' | 'numberSeries' | 'figureSeries' | 'figureMatrix'
  | 'numberAnalogy' | 'patternCompletion' | 'numberPuzzle' | 'paperFolding'
  | 'tryAgain' | 'nice' | 'levelUp' | 'newPuzzle'

const cache = new Map<string, HTMLAudioElement>()

function get(path: string): HTMLAudioElement {
  let a = cache.get(path)
  if (!a) {
    a = new Audio(path)
    a.preload = 'auto'
    cache.set(path, a)
  }
  return a
}

export function playEffect(effect: Sfx, volume = 1): void {
  const a = get(`/games/shared/sfx/${effect}.mp3`)
  a.volume = volume
  a.currentTime = 0
  void a.play().catch(() => {})
}

let speaking: HTMLAudioElement | null = null

/** Speak a line; a new line interrupts whatever is still playing. */
export function playVoice(name: Voice, volume = 1): void {
  if (speaking) {
    speaking.pause()
    speaking.currentTime = 0
  }
  const a = get(`/games/gifted/voice/${name}.mp3`)
  a.volume = volume
  a.currentTime = 0
  speaking = a
  void a.play().catch(() => {})
}

export function stopVoice(): void {
  if (speaking) {
    speaking.pause()
    speaking.currentTime = 0
    speaking = null
  }
}
