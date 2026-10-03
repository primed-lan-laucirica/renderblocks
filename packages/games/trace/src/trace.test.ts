import { describe, expect, it } from 'vitest'
import { arcPoint, GLYPHS, layout, sample, SHAPES, type Seg } from './glyphs'
import { dots, FADE, goodEnough, liftTrace, moveTrace, nextLevel, NUMBER_START, overlap, startTrace, TOP, traced } from './fade'
import { DEFAULT_PRACTICE, pickRound, practicePool, textItem, traceGroups } from './items'

const start = (s: Seg) => (s.k === 'L' ? s.a : arcPoint(s, s.from))
const end = (s: Seg) => (s.k === 'L' ? s.b : arcPoint(s, s.to))

describe('glyphs', () => {
  const all = { ...GLYPHS, ...SHAPES }
  it('has every letter, digit and shape', () => {
    for (const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') expect(GLYPHS[ch], ch).toBeDefined()
  })
  it('joins each stroke up: every segment starts where the last ended', () => {
    for (const [name, g] of Object.entries(all))
      for (const st of g.strokes)
        if ('segs' in st)
          for (let i = 1; i < st.segs.length; i++) {
            const a = end(st.segs[i - 1])
            const b = start(st.segs[i])
            expect(Math.hypot(a.x - b.x, a.y - b.y), `${name} stroke joins`).toBeLessThan(0.03)
          }
  })
  it('keeps every glyph inside its box, between the headline and the descender', () => {
    for (const [name, g] of Object.entries(all))
      for (const st of g.strokes) {
        const p = sample(st)
        for (const q of p.pts) {
          expect(q.x, `${name} x`).toBeGreaterThan(-0.06)
          expect(q.x, `${name} x`).toBeLessThan(g.w + 0.06)
          expect(q.y, `${name} y`).toBeGreaterThan(-0.06)
          expect(q.y, `${name} y`).toBeLessThan(3.06)
        }
      }
  })
  it('sits lowercase on the baseline, x-height letters under the midline', () => {
    for (const ch of 'acemnorsuvwxz') {
      const ys = GLYPHS[ch].strokes.flatMap((s) => sample(s).pts.map((q) => q.y))
      expect(Math.min(...ys), ch).toBeGreaterThan(0.94)
      expect(Math.max(...ys), ch).toBeLessThan(2.06)
    }
  })
  it('lays out words left to right and wraps a long sentence', () => {
    const w = layout('cat')
    expect(w.chars.map((c) => c.ch).join('')).toBe('cat')
    expect(w.chars[1].x).toBeGreaterThan(w.chars[0].x)
    expect(w.tall).toBe(true) // the t
    expect(layout('no').tall).toBe(false)
    const s = layout('A cat is a mammal, like a dog or a cow.', 16)
    expect(s.lines).toBeGreaterThan(1)
  })
})

describe('tracing a locked path', () => {
  const strokes = layout('t').strokes
  it('completes when he follows each stroke from its start, in order', () => {
    let t = startTrace()
    for (const p of strokes) {
      p.pts.forEach((q) => (t = moveTrace(t, strokes, q).t))
      t = liftTrace(t, strokes)
    }
    expect(traced(t, strokes)).toBe(true)
  })
  it("doesn't count a stroke drawn backwards, or the second stroke first", () => {
    let t = startTrace()
    const [down, across] = strokes
    ;[...down.pts].reverse().forEach((q) => (t = moveTrace(t, strokes, q).t))
    expect(t.stroke).toBe(0)
    expect(t.progress).toBeLessThan(0.15)
    across.pts.forEach((q) => (t = moveTrace(t, strokes, q).t))
    expect(t.stroke).toBe(0)
  })
  it('lets a finger that slips off rejoin a little further along', () => {
    let t = startTrace()
    const p = strokes[0]
    const third = Math.floor(p.pts.length / 3)
    p.pts.slice(0, third).forEach((q) => (t = moveTrace(t, strokes, q).t))
    t = moveTrace(t, strokes, { x: 3, y: 3 }).t
    // Back on, about 0.25 further along, and on to the end.
    p.pts.slice(third + 8).forEach((q) => (t = moveTrace(t, strokes, q).t))
    expect(t.stroke).toBe(1)
  })
  it('lets a wandering finger come back and carry on', () => {
    let t = startTrace()
    const p = strokes[0]
    const half = Math.floor(p.pts.length / 2)
    p.pts.slice(0, half).forEach((q) => (t = moveTrace(t, strokes, q).t))
    const off = moveTrace(t, strokes, { x: 3, y: 3 })
    expect(off.ink).toBe(false)
    t = off.t
    p.pts.slice(half - 2).forEach((q) => (t = moveTrace(t, strokes, q).t))
    expect(t.stroke).toBe(1)
  })
  it('taps a dot', () => {
    const i = layout('i').strokes
    let t = startTrace()
    i[0].pts.forEach((q) => (t = moveTrace(t, i, q).t))
    t = liftTrace(t, i)
    t = moveTrace(t, i, i[1].pts[0]).t
    expect(traced(t, i)).toBe(true)
  })
})

describe('the fade', () => {
  it('runs from a solid path through dots and flashes to a blank page', () => {
    expect(FADE[0]).toMatchObject({ phase: 'solid', arrows: true })
    expect(FADE.map((s) => s.phase)).toEqual([...FADE.map((s) => s.phase)].sort((a, b) => ['solid', 'dots', 'flash', 'blank'].indexOf(a) - ['solid', 'dots', 'flash', 'blank'].indexOf(b)))
    expect(FADE[TOP].phase).toBe('blank')
    expect(FADE[NUMBER_START].startsOnly).toBe(true)
    const flashes = FADE.filter((s) => s.phase === 'flash')
    for (let i = 1; i < flashes.length; i++) expect(flashes[i].show!).toBeLessThanOrEqual(flashes[i - 1].show!) // shorter
    const timed = flashes.filter((s) => s.every)
    for (let i = 1; i < timed.length; i++) expect(timed[i].every!).toBeGreaterThan(timed[i - 1].every!) // rarer
  })
  it('thins the dots, keeping the corners and the ends', () => {
    const [z] = layout('z').strokes
    const counts = [0.16, 0.3, 0.55, 0.9, Infinity].map((sp) => dots(z, sp).length)
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
    const sparse = dots(z, Infinity)
    // z: start, two corners, end.
    expect(sparse.length).toBe(4)
    expect(dots(z, 0.16, true)).toHaveLength(1)
    // A circle keeps its top, bottom and sides.
    const [o] = layout('o').strokes
    expect(dots(o, Infinity).length).toBeGreaterThanOrEqual(4)
  })
  it('accepts his own writing of the shape, and not a scribble', () => {
    const strokes = layout('7').strokes
    const wobbly = strokes.map((p) => p.pts.map((q, i) => ({ x: q.x + Math.sin(i) * 0.08, y: q.y + 0.1 })))
    expect(goodEnough(overlap(strokes, wobbly))).toBe(true)
    const scribble = [Array.from({ length: 60 }, (_, i) => ({ x: (i % 10) / 5, y: 2 + (i % 7) / 10 }))]
    expect(goodEnough(overlap(strokes, scribble))).toBe(false)
    expect(overlap(strokes, []).cover).toBe(0)
  })
  it('moves a step on for a clean try and back for a struggle', () => {
    expect(nextLevel(3, 'clean')).toBe(4)
    expect(nextLevel(3, 'ok')).toBe(3)
    expect(nextLevel(3, 'struggle')).toBe(2)
    expect(nextLevel(0, 'struggle')).toBe(0)
    expect(nextLevel(TOP, 'clean')).toBe(TOP)
  })
})

describe('items', () => {
  it('offers numbers, letters, words, sentences and shapes to trace', () => {
    const groups = traceGroups(['Render'])
    expect(groups.map((g) => g.title)).toEqual(['Numbers', 'Letters', 'Words', 'Sentences', 'Shapes'])
    expect(groups[2].sets[0].items[0].text).toBe('Render')
    for (const g of groups) for (const s of g.sets) for (const item of s.items) expect(layout(item.text, 16, item.kind === 'shape' ? item.text : undefined).strokes.length, item.text).toBeGreaterThan(0)
  })
  it('reads a typed entry as a number, a letter, a word or a sentence', () => {
    expect(textItem('42').kind).toBe('number')
    expect(textItem('Q').kind).toBe('upper')
    expect(textItem('cat').say).toEqual({ word: 'cat' })
    expect(textItem('I see a cat').kind).toBe('sentence')
  })
  it('picks a mixed round with no repeats, least recently practised first', () => {
    const pool = practicePool(DEFAULT_PRACTICE, [])
    const round = pickRound(pool, {}, 5, () => 0.5)
    expect(new Set(round.map((i) => i.key)).size).toBe(5)
    expect(new Set(round.map((i) => (i.kind === 'upper' || i.kind === 'lower' ? 'letter' : i.kind))).size).toBe(3)
    const seen = Object.fromEntries(pool.filter((i) => i.kind === 'number' && i.text !== '7').map((i) => [i.key, { level: 5, seen: Date.now() }]))
    expect(pickRound(pool, seen, 5, () => 0.5).find((i) => i.kind === 'number')?.text).toBe('7')
  })
})
