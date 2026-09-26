import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LEVELS, WORDS } from './words'

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

  it('gives every sounding part a sound clip, and silent parts none', () => {
    for (const w of WORDS) {
      for (const p of w.parts) {
        if (p.silent) expect(p.sound).toBeNull()
        else {
          expect(p.sound, `${w.word}: ${p.g}`).toBeTruthy()
          expect(existsSync(join(PUBLIC, 'sounds', `${p.sound}.mp3`)), `${p.sound}.mp3`).toBe(true)
        }
      }
      expect(existsSync(join(PUBLIC, 'audio', `${w.word}.mp3`)), `${w.word}.mp3`).toBe(true)
    }
  })

  it('says stops once and lets vowels and other sounds be held', () => {
    const part = (word: string, g: string) => WORDS.find((w) => w.word === word)!.parts.find((p) => p.g === g)!
    expect(part('at', 't').stretch).toBe(false)
    expect(part('said', 'd').stretch).toBe(false)
    expect(part('see', 's').stretch).toBe(true)
    expect(part('see', 'ee').stretch).toBe(true)
    expect(part('said', 'ai').heart).toBe(true)
  })
})
