import type { SubtestId } from './types'

/**
 * All audio is pre-generated (tools/audio/generate.mjs) and shipped as files —
 * the app never calls a speech API at runtime.
 */
type Sfx = 'correct' | 'wrong' | 'celebrate' | 'pop' | 'whoosh'
/**
 * Spoken lines live in /games/gifted/voice/. Subtest ids double as clip
 * names; Following Directions has no hint clip (its sentences are the item,
 * and live in /games/gifted/directions/ instead).
 */
export type Voice = SubtestId | 'tryAgain' | 'nice' | 'levelUp' | 'newPuzzle'

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

/**
 * Verbal reinforcement in the children's-chorus voice — the same yes/no
 * Render already knows from Shapes and Combos, so the meaning needs no
 * learning. Paired with a chime/thunk: the effect lands instantly, the voice
 * follows a beat later and carries the judgement.
 */
export function playFeedback(kind: 'yes' | 'no' | 'cheer', volume = 1): void {
  const a = get(`/games/gifted/audio/${kind}.mp3`)
  a.volume = volume
  a.currentTime = 0
  void a.play().catch(() => {})
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

/** Following Directions sentences live in /games/gifted/directions/. */
export function playDirection(clip: string, volume = 1): void {
  if (speaking) {
    speaking.pause()
    speaking.currentTime = 0
  }
  const a = get(`/games/gifted/directions/${clip}.mp3`)
  a.volume = volume
  a.currentTime = 0
  speaking = a
  void a.play().catch(() => {})
}

/** Aural Reasoning questions live in /games/gifted/aural/ — the sentence IS the item. */
export function playAural(clip: string, volume = 1): void {
  if (speaking) {
    speaking.pause()
    speaking.currentTime = 0
  }
  const a = get(`/games/gifted/aural/${clip}.mp3`)
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
