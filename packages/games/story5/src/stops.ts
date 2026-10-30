/** The stops along the Story of Numbers' bead chain, and how each is shown. */
import { PARTS } from './curriculum'
import type { SceneDef } from './engine/scene'
import { EPISODES } from './episodes'
import { BAR_COLOURS, GOLD } from './kit/sizes'
import { WORKSHOPS } from './workshops'

export type Stop = { kind: 'episode'; id: string; n: number; part: number } | { kind: 'workshop'; id: string; part: number }

/** Along the chain: Episode 0, then each part's episodes and its workshop. */
export const STOPS: Stop[] = [
  ...(EPISODES[0] ? [{ kind: 'episode', id: 'ep0', n: 0, part: 0 } as Stop] : []),
  ...PARTS.flatMap((p) => [
    ...p.episodes.filter((e) => EPISODES[e.n]).map((e) => ({ kind: 'episode', id: `ep${e.n}`, n: e.n, part: p.n }) as Stop),
    ...(WORKSHOPS[p.n] ? [{ kind: 'workshop', id: `ws${p.n}`, part: p.n } as Stop] : []),
  ]),
]

/** Each part's beads: the Montessori bead colours (1 red, 2 green, 3 pink, 4 yellow, 5 light blue, 6 lavender); Episode 0's are gold. */
export const beadColour = (part: number) => (part === 0 ? GOLD : BAR_COLOURS[(part - 1) % BAR_COLOURS.length])

/** The moment a window shows: just before his first turn, or halfway. */
export function posterT(s: SceneDef) {
  const b = s.beats[0]
  return b && b.time > 4 ? b.time - 0.2 : s.duration * 0.5
}
