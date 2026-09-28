import { useCallback, useEffect, useRef, useState } from 'react'
import { playSentence, sentenceTime, unlockAudio } from './audio'
import { SENTENCES, type Sentence } from './words'

/** Which of a word's sentences comes next: they take turns. */
const turn = new Map<string, number>()

export function nextSentence(word: string): Sentence | null {
  const list = SENTENCES[word]
  if (!list?.length) return null
  const i = turn.get(word) ?? 0
  turn.set(word, (i + 1) % list.length)
  return list[i]
}

/** Read a sentence aloud and follow along: `spoken` is the word being said. */
export function useReader() {
  const [spoken, setSpoken] = useState<number | null>(null)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const read = useCallback((s: Sentence): Promise<void> => {
    unlockAudio()
    cancelAnimationFrame(raf.current)
    const done = playSentence(s.audio)
    const asked = performance.now()
    let began = false
    const follow = () => {
      const t = sentenceTime()
      if (t === null) {
        // Not started yet (first play fetches the clip), or finished.
        if (!began && performance.now() - asked < 3000) raf.current = requestAnimationFrame(follow)
        else setSpoken(null)
        return
      }
      began = true
      const i = s.words.findIndex(([, , start, end]) => t >= start && t < end + 0.08)
      setSpoken(i >= 0 ? i : null)
      raf.current = requestAnimationFrame(follow)
    }
    raf.current = requestAnimationFrame(follow)
    return done
  }, [])

  const hush = useCallback(() => {
    cancelAnimationFrame(raf.current)
    setSpoken(null)
  }, [])

  return { spoken, read, hush }
}
