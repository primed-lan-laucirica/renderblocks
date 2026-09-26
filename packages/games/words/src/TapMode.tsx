import { useEffect, useRef, useState } from 'react'
import { playSound, playWord, type Voice } from './audio'
import { PartLetters, WORD_FONT } from './WordParts'
import type { Word } from './words'

/**
 * Each part is its own button: press to hear its sound, hold to stretch a
 * holdable one. Tapping every part in order, left to right, then says the word.
 */
export function TapMode({ word }: { word: Word }) {
  const [pressed, setPressed] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const voice = useRef<Voice | null>(null)
  const next = useRef(0)

  // (Remounted for each word, so it always starts fresh.)
  useEffect(() => () => voice.current?.stop(), [])

  const sounding = word.parts.map((p, i) => (p.silent ? -1 : i)).filter((i) => i >= 0)

  const press = (i: number) => {
    voice.current?.stop(0.03)
    setPressed(i)
    setDone(false)
    const p = word.parts[i]
    voice.current = playSound(p.sound, p.stretch)
    next.current = sounding[next.current] === i ? next.current + 1 : sounding[0] === i ? 1 : 0
  }
  const release = () => {
    if (pressed === null) return
    voice.current?.stop()
    setPressed(null)
    if (next.current === sounding.length) {
      next.current = 0
      setDone(true)
      window.setTimeout(() => (voice.current = playWord(word.word)), 250)
    }
  }

  return (
    <div className={`flex items-end gap-3 ${WORD_FONT}`}>
      {word.parts.map((p, i) => (
        <button
          key={i}
          type="button"
          disabled={p.silent}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            press(i)
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: 'none' }}
          className={`rounded-3xl px-3 pb-4 pt-6 border-4 ${
            p.silent
              ? 'border-transparent'
              : pressed === i
                ? 'bg-amber-200 border-amber-400'
                : done
                  ? 'bg-emerald-100 border-emerald-300'
                  : 'bg-white border-sky-200 active:bg-amber-100 shadow-md'
          }`}
        >
          <PartLetters part={p} lit={pressed === i} />
        </button>
      ))}
    </div>
  )
}
