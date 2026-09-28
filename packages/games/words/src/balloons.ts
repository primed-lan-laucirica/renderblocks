/**
 * Balloon rounds (pure, so tested directly). In "find it" the balloons carry
 * the word said and look-alikes: telling fin from fan, pin and fit takes
 * reading every letter — the vowel above all — not guessing from the shape.
 */

/** Letters apart, position by position; words of different lengths are far apart. */
function apart(a: string, b: string): number {
  if (a.length !== b.length) return 10 + Math.abs(a.length - b.length)
  let n = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++
  return n
}

/** Up to `n` words from `pool` that look most like `target`: one letter apart first, ties at random. */
export function lookAlikes(target: string, pool: string[], n: number, rand = Math.random): string[] {
  return pool
    .filter((w) => w !== target)
    .map((w) => ({ w, d: apart(target, w), r: rand() }))
    .sort((a, b) => a.d - b.d || a.r - b.r)
    .slice(0, n)
    .map((x) => x.w)
}

export function shuffle<T>(list: T[], rand = Math.random): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
