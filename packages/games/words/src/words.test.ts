import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lookAlikes, shuffle } from './balloons'
import { LEVELS, SENTENCES, WORDS } from './words'

const PUBLIC = join(__dirname, '..', '..', '..', 'app', 'public', 'games', 'words')

describe('word data', () => {
  it('has the five sight-word levels, then seven sound-it-out levels beyond them', () => {
    expect(LEVELS.filter((l) => l.kind === 'sight').map((l) => l.words.length)).toEqual([16, 16, 15, 15, 16]) // level 5 also holds "now"
    expect(LEVELS.filter((l) => l.kind === 'sound').map((l) => l.words.length)).toEqual([20, 20, 20, 20, 20, 20, 20])
    expect(new Set(WORDS.map((w) => w.word)).size).toBe(WORDS.length)
  })

  it('keeps sound-it-out words regular: no heart parts', () => {
    for (const w of WORDS.filter((w) => w.level >= 6)) expect(w.parts.some((p) => p.heart), w.word).toBe(false)
  })

  it('splits every word into parts that join back up', () => {
    for (const w of WORDS) expect(w.parts.map((p) => p.g).join('')).toBe(w.word)
  })

  it('has a recording for every word', () => {
    for (const w of WORDS) expect(existsSync(join(PUBLIC, 'audio', `${w.word}.mp3`)), `${w.word}.mp3`).toBe(true)
  })

  it('marks tricky and silent parts', () => {
    const part = (word: string, g: string) => WORDS.find((w) => w.word === word)!.parts.find((p) => p.g === g)!
    expect(part('said', 'ai').heart).toBe(true)
    expect(part('like', 'e').silent).toBe(true)
  })
})

describe('sentences', () => {
  it('gives every sound-it-out word sentences that mark it, with a clip and word timings', () => {
    const known = new Set(WORDS.map((w) => w.word))
    for (const w of WORDS.filter((w) => w.level >= 6)) expect(SENTENCES[w.word]?.length, w.word).toBeGreaterThanOrEqual(1)
    for (const [word, list] of Object.entries(SENTENCES)) {
      expect(known.has(word), word).toBe(true)
      for (const s of list) {
        expect(s.marks.length, s.text).toBeGreaterThan(0)
        // The marked span is the word, or a form of it (fins, bigger, zipper, dishes).
        for (const [a, b] of s.marks) expect(s.text.slice(a, b).toLowerCase().startsWith(word.slice(0, -1)), s.text).toBe(true)
        expect(existsSync(join(PUBLIC, 'sentences', `${s.audio}.mp3`)), s.audio).toBe(true)
        // Timings follow the words in order and name real words of the text.
        let last = -1
        for (const [a, b, start, end] of s.words) {
          expect(/^[\w'-]+$/.test(s.text.slice(a, b)), s.text).toBe(true)
          expect(start, s.text).toBeGreaterThanOrEqual(last)
          expect(end, s.text).toBeGreaterThanOrEqual(start)
          last = start
        }
      }
    }
  })
})

describe('balloons', () => {
  it('pairs a word with look-alikes one letter apart first', () => {
    const level7 = LEVELS.find((l) => l.level === 7)!.words.map((w) => w.word)
    const alike = lookAlikes('fin', level7, 3)
    expect(alike).toHaveLength(3)
    expect(alike).not.toContain('fin')
    // pin is one letter from fin; every pick is at least as close as any word left out.
    expect(alike).toContain('pin')
    const apart = (w: string) => (w.length === 3 ? [...w].filter((c, i) => c !== 'fin'[i]).length : 9)
    const worst = Math.max(...alike.map(apart))
    for (const w of level7.filter((w) => w !== 'fin' && !alike.includes(w))) expect(apart(w)).toBeGreaterThanOrEqual(worst)
  })

  it('finds three look-alikes for every word in every level', () => {
    for (const l of LEVELS) for (const w of l.words) expect(lookAlikes(w.word, l.words.map((x) => x.word), 3)).toHaveLength(3)
  })

  it('shuffles without losing anything', () => {
    const list = ['a', 'b', 'c', 'd', 'e']
    expect(shuffle(list).sort()).toEqual(list)
  })
})
