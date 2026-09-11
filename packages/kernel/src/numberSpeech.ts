/**
 * Speaks a number by stitching pre-generated word clips
 * (`/games/shared/number/*.mp3`, produced by tools/audio/generate.mjs).
 *
 * No API calls at runtime — the app only ever plays local files.
 */

const BASE = '/games/shared/number'

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty',
]
const TENS: Record<number, string> = {
  2: 'twenty', 3: 'thirty', 4: 'forty', 5: 'fifty',
  6: 'sixty', 7: 'seventy', 8: 'eighty', 9: 'ninety',
}
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion']

/** Under 1000 -> clip names, e.g. 342 -> three hundred forty two */
function underThousand(n: number): string[] {
  const out: string[] = []
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h > 0) out.push(ONES[h], 'hundred')
  if (rest > 0) {
    if (rest <= 20) out.push(ONES[rest])
    else {
      out.push(TENS[Math.floor(rest / 10)])
      if (rest % 10) out.push(ONES[rest % 10])
    }
  }
  return out
}

/** Clip names that read `value` aloud. Returns [] if it can't be spoken. */
export function numberToClips(value: number): string[] {
  if (!Number.isFinite(value)) return []
  const out: string[] = []
  let n = value
  if (n < 0) {
    out.push('negative')
    n = -n
  }
  const whole = Math.floor(n)
  const frac = n - whole

  if (whole === 0) out.push('zero')
  else {
    // Split into 3-digit groups, most significant first.
    const groups: number[] = []
    let rest = whole
    while (rest > 0) {
      groups.unshift(rest % 1000)
      rest = Math.floor(rest / 1000)
    }
    if (groups.length > SCALES.length) return [] // beyond trillions
    groups.forEach((g, i) => {
      if (g === 0) return
      out.push(...underThousand(g))
      const scale = SCALES[groups.length - 1 - i]
      if (scale) out.push(scale)
    })
  }

  if (frac > 0) {
    out.push('point')
    // Up to two decimal places, digit by digit, without a trailing zero.
    const digits = Math.round(frac * 100).toString().padStart(2, '0').replace(/0$/, '')
    for (const d of digits) out.push(ONES[Number(d)])
  }
  return out
}

export const OPERATOR_CLIP: Record<string, string> = {
  '+': 'plus',
  '−': 'minus',
  '-': 'minus',
  '×': 'times',
  '*': 'times',
  '÷': 'dividedBy',
  '/': 'dividedBy',
  '=': 'equals',
}

const cache = new Map<string, HTMLAudioElement>()
function clip(name: string): HTMLAudioElement {
  let a = cache.get(name)
  if (!a) {
    a = new Audio(`${BASE}/${name}.mp3`)
    a.preload = 'auto'
    cache.set(name, a)
  }
  return a
}

let token = 0

/** Play clips back to back. A new call cancels whatever is still speaking. */
export function playClips(names: string[], volume = 1): void {
  const mine = ++token
  let i = 0
  const next = () => {
    if (mine !== token || i >= names.length) return
    const a = clip(names[i++])
    a.volume = volume
    a.currentTime = 0
    a.onended = next
    void a.play().catch(() => {
      // Autoplay restrictions before first interaction — skip ahead.
      next()
    })
  }
  next()
}

export function speakNumber(value: number, volume = 1): void {
  playClips(numberToClips(value), volume)
}

const OP_SLUG: Record<string, string> = {
  '+': 'plus',
  '−': 'minus',
  '-': 'minus',
  '×': 'times',
  '*': 'times',
  '÷': 'dividedby',
  '/': 'dividedby',
}

const equationCache = new Map<string, HTMLAudioElement>()
/** The prompt currently reading, so answering can cut it off mid-sentence. */
let speakingEquation: HTMLAudioElement | null = null

/**
 * Speak the PROBLEM as one pre-generated utterance ending on "equals" —
 * the cue to solve. Stitched word clips sound robotic for a whole phrase,
 * so these are generated per equation (tools/audio/generate.mjs).
 * The answer is spoken separately, and only as the number.
 */
export function speakEquationPrompt(a: number, op: string, b: number, volume = 1): boolean {
  const slug = OP_SLUG[op]
  if (!slug) return false
  const name = `${a}_${slug}_${b}`
  let audio = equationCache.get(name)
  if (!audio) {
    audio = new Audio(`/games/shared/equations/${name}.mp3`)
    audio.preload = 'auto'
    equationCache.set(name, audio)
  }
  stopSpeech() // cut off anything still reading
  audio.volume = volume
  audio.currentTime = 0
  speakingEquation = audio
  void audio.play().catch(() => {})
  return true
}

/** e.g. speakEquation(3, '×', 4, 12) -> "three times four equals twelve" */
export function speakEquation(a: number, op: string, b: number, answer: number, volume = 1): void {
  const opClip = OPERATOR_CLIP[op]
  if (!opClip) return speakNumber(answer, volume)
  playClips(
    [...numberToClips(a), opClip, ...numberToClips(b), 'equals', ...numberToClips(answer)],
    volume,
  )
}

/** Stop any in-flight speech — stitched clips and equation prompts alike. */
export function stopSpeech(): void {
  token++
  if (speakingEquation) {
    speakingEquation.pause()
    speakingEquation.currentTime = 0
    speakingEquation = null
  }
}
