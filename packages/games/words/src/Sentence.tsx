import { useState } from 'react'
import { stopAll } from './audio'
import { nextSentence, useReader } from './reading'
import { SENTENCES, type Sentence } from './words'

/** A sentence with the word being learnt marked, and the word being said lit. */
export function SentenceText({ s, spoken }: { s: Sentence; spoken: number | null }) {
  return (
    <>
      {pieces(s).map((p, k) => (
        <span
          key={k}
          className={`${p.mark ? 'text-sky-600 underline decoration-4 underline-offset-8' : ''} ${
            p.token !== null && p.token === spoken ? 'bg-amber-200 rounded-lg' : ''
          }`}
        >
          {p.text}
        </span>
      ))}
    </>
  )
}

/**
 * The 💬 card: a sentence using the word that teaches something beyond it
 * (a category, a part, an opposite …). It opens silently — reading it is his
 * first go — with the word marked; tapping it reads it aloud, each word
 * lighting up as it is said.
 */
export function SentenceCard({ word }: { word: string }) {
  const [open, setOpen] = useState<Sentence | null>(null)
  const { spoken, read, hush } = useReader()
  if (!SENTENCES[word]?.length) return null

  const toggle = () => {
    hush()
    if (open) {
      stopAll()
      setOpen(null)
    } else setOpen(nextSentence(word))
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
          onClick={() => void read(open)}
          aria-label="Read the sentence"
          className="rounded-3xl bg-white shadow-lg px-6 py-4 text-left text-[clamp(1.5rem,4.5vw,2.6rem)] font-bold leading-snug text-slate-800 max-w-[min(92vw,48rem)]"
        >
          <SentenceText s={open} spoken={spoken} />
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
