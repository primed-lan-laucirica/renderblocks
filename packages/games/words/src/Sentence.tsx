import { useEffect, useRef, useState } from 'react'
import { playSentence, sentenceTime, stopAll, unlockAudio } from './audio'
import { SENTENCES, type Sentence } from './words'

/** Which of a word's sentences shows next: they take turns, one per opening. */
const turn = new Map<string, number>()

/**
 * The 💬 card: a sentence using the word that teaches something beyond it
 * (a category, a part, an opposite …). It opens silently — reading it is his
 * first go — with the word marked; tapping it reads it aloud, each word
 * lighting up as it is said.
 */
export function SentenceCard({ word }: { word: string }) {
  const list = SENTENCES[word]
  const [open, setOpen] = useState<Sentence | null>(null)
  const [spoken, setSpoken] = useState<number | null>(null)
  const raf = useRef(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  if (!list?.length) return null

  const toggle = () => {
    cancelAnimationFrame(raf.current)
    setSpoken(null)
    if (open) {
      stopAll()
      setOpen(null)
      return
    }
    const i = turn.get(word) ?? 0
    turn.set(word, (i + 1) % list.length)
    setOpen(list[i])
  }

  const read = (s: Sentence) => {
    unlockAudio()
    cancelAnimationFrame(raf.current)
    playSentence(s.audio)
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
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Hide the sentence' : 'Show a sentence'}
        className={`w-16 h-16 rounded-full shadow text-3xl ${open ? 'bg-sky-500' : 'bg-white'}`}
      >
        💬
      </button>
      {open && (
        <button
          type="button"
          onClick={() => read(open)}
          aria-label="Read the sentence"
          className="rounded-3xl bg-white shadow-lg px-6 py-4 text-left text-[clamp(1.5rem,4.5vw,2.6rem)] font-bold leading-snug text-slate-800 max-w-[min(92vw,48rem)]"
        >
          {pieces(open).map((p, k) => (
            <span
              key={k}
              className={`${p.mark ? 'text-sky-600 underline decoration-4 underline-offset-8' : ''} ${
                p.token !== null && p.token === spoken ? 'bg-amber-200 rounded-lg' : ''
              }`}
            >
              {p.text}
            </span>
          ))}
          <span className="ml-3 text-[0.8em] opacity-60" aria-hidden>
            🔊
          </span>
        </button>
      )}
    </div>
  )
}

/** Split a sentence into runs that share a word (for the reading light) and a mark (the word being learnt). */
function pieces(s: Sentence): Array<{ text: string; token: number | null; mark: boolean }> {
  const out: Array<{ text: string; token: number | null; mark: boolean }> = []
  for (let c = 0; c < s.text.length; c++) {
    const token = s.words.findIndex(([a, b]) => c >= a && c < b)
    const mark = s.marks.some(([a, b]) => c >= a && c < b)
    const last = out[out.length - 1]
    if (last && last.token === (token >= 0 ? token : null) && last.mark === mark) last.text += s.text[c]
    else out.push({ text: s.text[c], token: token >= 0 ? token : null, mark })
  }
  return out
}
