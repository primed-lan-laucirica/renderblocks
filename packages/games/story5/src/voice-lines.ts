/** Every line Story5 speaks, for scripts/voice.mjs to generate. */
import { ALL_SCENES } from './episodes'
import { WORKSHOPS } from './workshops'
import { COMMON_LINES } from './workshops/types'

export function allLines(): string[] {
  const out = new Set<string>()
  for (const s of ALL_SCENES) {
    for (const v of s.voice) out.add(v.say)
    for (const b of s.beats) out.add(b.say)
  }
  for (const w of Object.values(WORKSHOPS)) for (const l of w.lines) out.add(l)
  for (const l of Object.values(COMMON_LINES)) out.add(l)
  return [...out]
}
