import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { rng } from '@renderblocks/scene/ease'
import { OWNER, RANKS, SHEET_NAMES, signsOf, STAGES } from './data/path'
import { guess } from './engine/compile'
import { EXPLAINERS } from './explainers'
import { items } from './kit/glyphs'
import CLIPS from './voice.json'
import { LINES } from './voice-lines'

const clips = CLIPS as Record<string, { file: string; dur: number }>

/** Marks on a line that are not signs of the path: the gap, and the amount not yet known. */
const BLANKS = ['_', '?']

/** A scene's frame at t, as markup. */
const frame = (e: (typeof EXPLAINERS)[number], t: number, beat?: string) => renderToStaticMarkup(createElement(e.Scene, { t, beat }))

describe('the path, as the sheet has it', () => {
  it('53 ranks in order, in 7 stages', () => {
    expect(RANKS.length).toBe(53)
    RANKS.forEach((r, i) => expect(r.rank).toBe(i + 1))
    expect(STAGES.length).toBe(7)
  })

  it('a rank depends only on ranks above it', () => {
    for (const r of RANKS) for (const d of r.dependsOn) expect(d, `rank ${r.rank}`).toBeLessThan(r.rank)
  })

  it('every sign an equation line can show belongs to the rank the sheet gives it', () => {
    for (const r of RANKS.filter((x) => signsOf(x.rank).length)) {
      const sheet = r.glyphs.flatMap((g) => SHEET_NAMES[g] ?? [g])
      expect([...signsOf(r.rank)].sort(), `rank ${r.rank}`).toEqual([...sheet].sort())
    }
    for (const g of Object.keys(OWNER)) expect(RANKS[OWNER[g] - 1], g).toBeDefined()
  })
})

describe('every explainer keeps the path’s rules', () => {
  it('one explainer for each rank built, in order', () => {
    expect(EXPLAINERS.map((e) => e.rank)).toEqual(EXPLAINERS.map((_, i) => i + 1))
    for (const e of EXPLAINERS) expect(e.id).toBe(`r${String(e.rank).padStart(2, '0')}`)
  })

  for (const e of EXPLAINERS) {
    const teasers = e.spec.steps.some((s) => s.teaser)

    it(`${e.id}: no sign from a rank below it (the closing question may show the next rank’s)`, () => {
      expect(e.signs.length).toBeGreaterThan(0)
      for (const s of e.signs) {
        if (BLANKS.includes(s.g)) continue
        const owner = OWNER[s.g]
        expect(owner, `${e.id} shows "${s.g}" at ${s.t.toFixed(1)}s, which no rank owns`).toBeDefined()
        expect(owner, `${e.id} shows "${s.g}" (rank ${owner}) at ${s.t.toFixed(1)}s`).toBeLessThanOrEqual(e.rank + (s.teaser ? 1 : 0))
      }
    })

    it(`${e.id}: the same holds for what is drawn`, () => {
      const limit = e.rank + (teasers ? 1 : 0)
      const times = [...e.ends, ...e.turns.flatMap((x) => [x.time, x.demoAt, x.resume]), e.poster]
      for (const t of times)
        for (const m of frame(e, Math.min(t + 0.3, e.duration)).matchAll(/data-sign="([^"]*)"/g)) {
          const g = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          if (BLANKS.includes(g)) continue
          expect(OWNER[g], `${e.id} draws "${g}" at ${t.toFixed(1)}s`).toBeLessThanOrEqual(limit)
        }
    })

    it(`${e.id}: its own signs, and one from each rank it depends on`, () => {
      const shown = new Set(e.signs.filter((s) => !s.teaser).map((s) => s.g))
      for (const g of signsOf(e.rank)) expect(shown.has(g), `${e.id} never shows its own "${g}"`).toBe(true)
      for (const d of RANKS[e.rank - 1].dependsOn) expect(signsOf(d).some((g) => shown.has(g)), `${e.id} shows no sign of rank ${d}`).toBe(true)
    })

    it(`${e.id}: no silence over 2.5 s that is not a wait`, () => {
      const spoken = e.voice.map((v) => [v.time, v.time + (clips[v.say]?.dur ?? guess(v.say))] as [number, number]).sort((a, b) => a[0] - b[0])
      const quiet: [number, number][] = []
      let at = 0
      for (const [a, b] of spoken) {
        if (a > at) quiet.push([at, a])
        at = Math.max(at, b)
      }
      if (e.duration > at) quiet.push([at, e.duration])
      for (const [a, b] of quiet) {
        // What is left of the silence once the waits are taken out of it.
        const waited = e.waits.reduce((w, [x, y]) => w + Math.max(0, Math.min(b, y) - Math.max(a, x)), 0)
        expect(b - a - waited, `${e.id}: silence from ${a.toFixed(1)}s to ${b.toFixed(1)}s`).toBeLessThanOrEqual(2.5)
      }
    })

    it(`${e.id}: no line starts before the one before it has ended`, () => {
      const v = [...e.voice].sort((a, b) => a.time - b.time)
      for (let i = 1; i < v.length; i++) {
        const end = v[i - 1].time + (clips[v[i - 1].say]?.dur ?? guess(v[i - 1].say))
        expect(v[i].time, `${e.id}: "${v[i].say}" over "${v[i - 1].say}"`).toBeGreaterThanOrEqual(end - 0.01)
      }
    })

    it(`${e.id}: four acts in order, a question to open, turns of his own to close`, () => {
      expect(e.acts.map((a) => a.act)).toEqual([1, 2, 3, 4])
      for (let i = 1; i < e.acts.length; i++) expect(e.acts[i].time).toBeGreaterThan(e.acts[i - 1].time)
      expect(e.spec.steps[0].turn?.kind, `${e.id} opens on a prediction`).toBe('predict')
      const mine = e.turns.filter((x) => x.time >= e.acts[3].time)
      expect(mine.length, `${e.id}: turns in act 4`).toBeGreaterThanOrEqual(2)
      expect(mine.some((x) => x.turn.kind === 'read'), `${e.id}: a line to read`).toBe(true)
      expect(e.poster).toBeGreaterThan(0)
      expect(e.poster).toBeLessThan(e.acts[3].time)
      expect(e.duration).toBeLessThanOrEqual(180)
    })

    it(`${e.id}: every turn can be done, and its answer is true`, () => {
      const ids = e.turns.map((x) => x.turn.id)
      expect(new Set(ids).size, `${e.id}: turn ids`).toBe(ids.length)
      for (const x of e.turns) {
        expect(x.resume, `${e.id}:${x.turn.id}`).toBeGreaterThan(x.time)
        expect(x.demoAt).toBeGreaterThanOrEqual(x.time)
        const turn = x.turn
        if (turn.kind === 'choose') {
          expect(turn.right).toBeLessThan(turn.cards.length)
          expect(turn.cards.length).toBeGreaterThanOrEqual(2)
        }
        if (turn.kind === 'place') {
          expect(turn.tiles, `${e.id}:${turn.id}`).toContain(turn.right)
          expect(items(turn.toks).filter((t) => t.g === '_').length, `${e.id}:${turn.id} has one gap`).toBe(1)
        }
        if (turn.kind === 'build') {
          expect(turn.target).toBeGreaterThan(0)
          expect(turn.max ?? turn.target + 4).toBeGreaterThanOrEqual(turn.target)
          for (let n = 0; n <= (turn.max ?? turn.target + 4); n++) expect(Object.keys(turn.state(n)).length).toBeGreaterThan(0)
        }
      }
    })

    it(`${e.id}: the same frame at the same t, whatever order the frames are drawn in`, () => {
      const times = [0.5, e.duration * 0.27, e.duration * 0.5, e.duration * 0.83, e.duration, e.poster, ...e.turns.flatMap((x) => [x.time, x.resume])]
      const first = times.map((t) => frame(e, t))
      const r = rng(9)
      const order = times.map((_, i) => i).sort(() => r() - 0.5)
      const again: string[] = []
      for (const i of order) again[i] = frame(e, times[i])
      times.forEach((t, i) => expect(again[i], `${e.id} at ${t}s`).toBe(first[i]))
    })

    it(`${e.id}: cues inside its length`, () => {
      for (const ev of e.events) expect(ev.time).toBeLessThanOrEqual(e.duration)
    })
  }
})

describe('the voice', () => {
  it('every line has a clip', () => {
    for (const text of LINES) expect(clips[text], `no clip for "${text}"`).toBeDefined()
    for (const e of EXPLAINERS) expect(e.unvoiced, e.id).toEqual([])
  })

  it('no clip is left over from a line that has changed', () => {
    for (const text of Object.keys(clips)) expect(LINES, `clip for "${text}"`).toContain(text)
  })

  it('narration never writes a sign out: it is spoken, so it uses the sign’s name', () => {
    for (const text of LINES) expect(/[=+−×÷·<>≤≥≠/()√%≈|±∞∝ΣΠπθ]/.test(text), text).toBe(false)
  })
})
