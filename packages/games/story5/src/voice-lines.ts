/** Every line Story5 speaks, for scripts/voice.mjs to generate. */
import { ALL_SCENES } from './episodes'
import { LINES } from './workshops/lines'

export function allLines(): string[] {
  const out = new Set<string>()
  for (const s of ALL_SCENES) {
    for (const v of s.voice) out.add(v.say)
    for (const b of s.beats) out.add(b.say)
  }
  for (const l of Object.values(LINES)) out.add(l)
  return [...out]
}
