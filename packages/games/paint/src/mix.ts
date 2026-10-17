/// <reference path="./spectral.d.ts" />
/**
 * The mixing cup: dabs of paint mixed the way real paint mixes (spectral.js,
 * Kubelka-Munk), so blue and yellow make green, not the grey that averaging
 * screen colours gives.
 */
import { Color, mix } from 'spectral.js'

/** What's in the cup: how many dabs of each colour, in the order they went in. */
export type Dabs = [colour: string, n: number][]

/** One more dab of `colour`. */
export function addDab(dabs: Dabs, colour: string): Dabs {
  const c = colour.toUpperCase()
  return dabs.some(([d]) => d === c) ? dabs.map(([d, n]) => [d, d === c ? n + 1 : n]) : [...dabs, [c, 1]]
}

export const dabCount = (dabs: Dabs) => dabs.reduce((s, [, n]) => s + n, 0)

const cache = new Map<string, string>()

/** The colour of the paint in the cup, or null when it's empty. Each dab is one part. */
export function mixed(dabs: Dabs): string | null {
  if (!dabs.length) return null
  if (dabs.length === 1) return dabs[0][0]
  const key = JSON.stringify(dabs)
  let c = cache.get(key)
  if (!c) {
    c = mix(...dabs.map(([d, n]) => [new Color(d), n] as [Color, number]))
      .toString()
      .toUpperCase()
    cache.set(key, c)
  }
  return c
}

/** His own colours, newest first: `c` goes to the front, at most `max` kept. */
export function remember(mine: string[], c: string, max = 8): string[] {
  return [c, ...mine.filter((m) => m !== c)].slice(0, max)
}
