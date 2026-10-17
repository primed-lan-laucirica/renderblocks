import { describe, expect, it } from 'vitest'
import { addDab, dabCount, mixed, remember, type Dabs } from './mix'
import { COLOURS } from './palette'

const [RED, YELLOW, BLUE, WHITE, BLACK] = COLOURS

function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  if (d) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  // Reds either side of 0°, so red to yellow runs -15° to 50°.
  return { h: h > 300 ? h - 360 : h, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l }
}
const cup = (...cs: string[]) => cs.reduce<Dabs>((d, c) => addDab(d, c), [])

describe('the mixing cup', () => {
  it('counts dabs of the same colour together', () => {
    const d = cup(RED, YELLOW, RED)
    expect(d).toEqual([
      [RED, 2],
      [YELLOW, 1],
    ])
    expect(dabCount(d)).toBe(3)
  })

  it('is empty, or one colour, without mixing', () => {
    expect(mixed([])).toBeNull()
    expect(mixed(cup(BLUE, BLUE))).toBe(BLUE)
  })

  it('mixes like paint: the secondary colours', () => {
    expect(hsl(mixed(cup(RED, YELLOW))!).h).toBeGreaterThan(hsl(RED).h)
    expect(hsl(mixed(cup(RED, YELLOW, YELLOW))!).h).toBeGreaterThan(15)
    expect(hsl(mixed(cup(RED, YELLOW, YELLOW))!).h).toBeLessThan(40) // orange
    expect(hsl(mixed(cup(BLUE, YELLOW))!).h).toBeGreaterThan(90)
    expect(hsl(mixed(cup(BLUE, YELLOW))!).h).toBeLessThan(150) // green
    expect(hsl(mixed(cup(RED, BLUE))!).h).toBeGreaterThan(255)
    expect(hsl(mixed(cup(RED, BLUE))!).h).toBeLessThan(320) // purple
  })

  it('takes more of what there is more of', () => {
    const orange = hsl(mixed(cup(RED, YELLOW))!).h
    expect(hsl(mixed(cup(RED, YELLOW, YELLOW))!).h).toBeGreaterThan(orange)
    expect(hsl(mixed(cup(RED, RED, YELLOW))!).h).toBeLessThan(orange)
  })

  it('goes paler with white and darker with black', () => {
    expect(hsl(mixed(cup(RED, WHITE))!).l).toBeGreaterThan(hsl(RED).l)
    expect(hsl(mixed(cup(RED, WHITE, WHITE))!).l).toBeGreaterThan(hsl(mixed(cup(RED, WHITE))!).l)
    expect(hsl(mixed(cup(BLUE, BLACK))!).l).toBeLessThan(hsl(BLUE).l)
  })

  it('goes muddy with all three', () => {
    expect(hsl(mixed(cup(RED, YELLOW, BLUE))!).s).toBeLessThan(0.4)
  })

  it('remembers his colours newest first, without repeats', () => {
    expect(remember(['#111111', '#222222'], '#222222')).toEqual(['#222222', '#111111'])
    expect(remember(Array.from({ length: 8 }, (_, i) => `#00000${i}`), '#FFFFFF')).toHaveLength(8)
  })
})
