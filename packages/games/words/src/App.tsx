import { useEffect, useMemo, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { playWord, preload, stopAll, unlockAudio } from './audio'
import { BlendMode } from './BlendMode'
import { SlideMode } from './SlideMode'
import { TapMode } from './TapMode'
import { LEVELS } from './words'

type Mode = 'slide' | 'tap' | 'blend'

/** Ways to sound a word out, side by side — which one he takes to is the experiment. */
const MODES: Array<{ id: Mode; icon: string; name: string }> = [
  { id: 'slide', icon: '👉', name: 'Slide' },
  { id: 'tap', icon: '👆', name: 'Tap' },
  { id: 'blend', icon: '🧲', name: 'Blend' },
]

function App({ services }: GameProps) {
  const { storage } = services
  const [level, setLevel] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>(() => (storage.get('mode') as Mode) || 'slide')
  const [index, setIndex] = useState(0)

  useEffect(() => storage.set('mode', mode), [storage, mode])

  // Back: word screen -> levels -> home.
  useEffect(
    () =>
      services.onBack(() => {
        if (level === null) return false
        stopAll()
        setLevel(null)
        return true
      }),
    [services, level],
  )

  const words = useMemo(() => (level === null ? [] : LEVELS[level - 1].words), [level])
  const word = words[index]
  useEffect(() => {
    // Have this word and the next ready to play.
    if (word) preload(word)
    if (words[index + 1]) preload(words[index + 1])
  }, [word, words, index])

  const open = (lvl: number) => {
    unlockAudio()
    const saved = Number(storage.get(`index${lvl}`) ?? 0)
    setIndex(Math.min(saved, LEVELS[lvl - 1].words.length - 1))
    setLevel(lvl)
  }
  const go = (d: number) => {
    stopAll()
    const next = (index + d + words.length) % words.length
    setIndex(next)
    if (level) storage.set(`index${level}`, String(next))
  }

  if (level === null || !word) {
    return (
      <div className="h-dvh overflow-y-auto bg-linear-to-b from-sky-100 via-white to-amber-50 select-none">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={services.exitToHome} className="w-11 h-11 rounded-full bg-white shadow text-xl font-bold" aria-label="Home">
              ←
            </button>
            <h1 className="text-3xl font-black text-sky-700">Words</h1>
          </div>
          {LEVELS.map(({ level: lvl, words: ws }) => (
            <button
              key={lvl}
              type="button"
              onClick={() => open(lvl)}
              className="rounded-3xl bg-white shadow-md border-4 border-sky-200 active:bg-sky-50 px-5 py-4 text-left"
            >
              <div className="text-lg font-extrabold text-sky-600">Level {lvl}</div>
              <div className="text-3xl font-black text-slate-800 truncate">{ws.slice(0, 6).map((w) => w.word).join(' ')} …</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const arrow = 'w-16 h-16 shrink-0 rounded-full bg-white shadow-md text-3xl font-black text-sky-600 active:bg-sky-50'

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-linear-to-b from-sky-100 via-white to-amber-50 select-none" onPointerDown={unlockAudio}>
      <div className="flex items-center gap-3 p-3">
        <button type="button" onClick={() => (stopAll(), setLevel(null))} className="w-11 h-11 rounded-full bg-white shadow text-xl font-bold" aria-label="Levels">
          ←
        </button>
        <div className="text-lg font-extrabold text-sky-700">Level {level}</div>
        <div className="ml-auto flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => (stopAll(), setMode(m.id))}
              className={`px-4 py-2 rounded-2xl text-lg font-extrabold border-4 ${
                mode === m.id ? 'bg-sky-500 text-white border-sky-300' : 'bg-white text-sky-700 border-transparent shadow'
              }`}
            >
              {m.icon} {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center gap-2 px-2">
        <button type="button" onClick={() => go(-1)} className={arrow} aria-label="Previous word">
          ‹
        </button>
        <div className="flex-1 min-w-0 flex justify-center">
          {mode === 'slide' && <SlideMode key={word.word} word={word} />}
          {mode === 'tap' && <TapMode key={word.word} word={word} />}
          {mode === 'blend' && <BlendMode key={word.word} word={word} />}
        </div>
        <button type="button" onClick={() => go(1)} className={arrow} aria-label="Next word">
          ›
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 pb-6">
        <button
          type="button"
          onClick={() => playWord(word.word)}
          className="px-6 py-3 rounded-2xl bg-white shadow-md text-3xl active:bg-sky-50"
          aria-label="Hear the word"
        >
          🔊
        </button>
        <div className="text-lg font-bold text-slate-400 tabular-nums">
          {index + 1} / {words.length}
        </div>
      </div>
    </div>
  )
}

export default App
