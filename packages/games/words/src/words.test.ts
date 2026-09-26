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

  it('has a recording for every word', () => {
    for (const w of WORDS) expect(existsSync(join(PUBLIC, 'audio', `${w.word}.mp3`)), `${w.word}.mp3`).toBe(true)
  })

  it('marks tricky and silent parts', () => {
    const part = (word: string, g: string) => WORDS.find((w) => w.word === word)!.parts.find((p) => p.g === g)!
    expect(part('said', 'ai').heart).toBe(true)
    expect(part('like', 'e').silent).toBe(true)
  })
})
