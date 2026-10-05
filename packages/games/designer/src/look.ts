/**
 * A character's look, and the saved design — the format LavaBlocks can
 * later read to dress its blocks (Character-Designer-research.md). Numbers
 * are stored as strings, since they can be any size.
 */
import type { Shape, ShapeKind } from './shapes'

export const EYES = ['oval', 'round', 'sleepy', 'star', 'wink', 'one', 'glasses'] as const
export const MOUTHS = ['smile', 'grin', 'o', 'tongue', 'flat'] as const
export const ARMS = ['short', 'long', 'wave', 'up', 'none'] as const
export const LEGS = ['short', 'long', 'none'] as const
export const HATS = ['none', 'helmet', 'crown', 'bow', 'cap', 'party'] as const

export interface Look {
  eyes: (typeof EYES)[number]
  mouth: (typeof MOUTHS)[number]
  arms: (typeof ARMS)[number]
  legs: (typeof LEGS)[number]
  hat: (typeof HATS)[number]
}

export const DEFAULT_LOOK: Look = { eyes: 'oval', mouth: 'smile', arms: 'short', legs: 'short', hat: 'none' }

/** The next style of one part (a tap on its button). */
export function next<K extends keyof Look>(look: Look, part: K): Look {
  const list = { eyes: EYES, mouth: MOUTHS, arms: ARMS, legs: LEGS, hat: HATS }[part] as unknown as readonly Look[K][]
  return { ...look, [part]: list[(list.indexOf(look[part]) + 1) % list.length] }
}

/** A surprise look. */
export function surprise(rand = Math.random): Look {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]
  return { eyes: pick(EYES), mouth: pick(MOUTHS), arms: pick(ARMS), legs: pick(LEGS), hat: pick(HATS) }
}

/** A saved design: the number, its shape, where its leftover blocks sit, and its look. */
export interface Design {
  n: string
  shape: { kind: ShapeKind; cols: string; rows: string; left: string }
  leftovers: number[]
  look: Look
}

export const toDesign = (n: bigint, shape: Shape, leftovers: number[], look: Look): Design => ({
  n: n.toString(),
  shape: { kind: shape.kind, cols: shape.cols.toString(), rows: shape.rows.toString(), left: shape.left.toString() },
  leftovers,
  look,
})

export function fromDesign(d: Design): { n: bigint; shape: Shape; leftovers: number[]; look: Look } | null {
  try {
    return {
      n: BigInt(d.n),
      shape: { kind: d.shape.kind, cols: BigInt(d.shape.cols), rows: BigInt(d.shape.rows), left: BigInt(d.shape.left) },
      leftovers: Array.isArray(d.leftovers) ? d.leftovers : [],
      look: { ...DEFAULT_LOOK, ...d.look },
    }
  } catch {
    return null
  }
}
