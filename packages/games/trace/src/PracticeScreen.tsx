import { useEffect, useRef, useState } from 'react'
import { wrapFor } from './sheet'
import { Page, type Done, type Pen } from './Page'
import { effect } from './audio'
import { FADE, nextLevel, TOP } from './fade'
import { levelOf, startLevel, type Item, type ProgressMap } from './items'

interface Props {
  round: Item[]
  progress: ProgressMap
  onProgress: (key: string, level: number) => void
  pen: Pen
  onFinished: (item: Item, d: Done) => void
  onAgain: () => void
  onExit: () => void
}

/**
 * Practice (Handwriting-MVP-spec.md: the fade): a short round, each item at
 * its own step of the fade. A clean try moves it a step on (and earns the
 * round's one kind of mark, a star); a struggle moves it back a step.
 */
export function PracticeScreen({ round, progress, onProgress, pen, onFinished, onAgain, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [stars, setStars] = useState(0)
  const [star, setStar] = useState(false)
  const timer = useRef(0)
  const [wrap] = useState(() => wrapFor(window.innerWidth, window.innerHeight))
  const item = round[index]
  // The level this page opened at (it may move while the page is still showing its reveal).
  const [level] = useState(() => round.map((i) => levelOf(i, progress)))
  const step = item ? FADE[level[index]] : FADE[0]

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onDone = (d: Done) => {
    const from = level[index]
    const to = nextLevel(from, d.result, Math.min(from, startLevel(item)))
    onProgress(item.key, to)
    onFinished(item, d)
    if (to > from) {
      setStars((s) => s + 1)
      setStar(true)
      effect('celebrate', 0.55)
    } else effect('correct', 0.4)
    // Time to see his writing against the model before the next page.
    timer.current = window.setTimeout(() => {
      setStar(false)
      setIndex((i) => i + 1)
    }, step.locked ? 1600 : 2600)
  }

  if (!item)
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-7xl font-black text-amber-500">★ {stars}</div>
        <div className="flex gap-3">
          <button type="button" onClick={onAgain} className="h-16 px-8 rounded-3xl bg-amber-400 text-white text-2xl font-black shadow">
            Again
          </button>
          <button type="button" onClick={onExit} className="h-16 px-8 rounded-3xl bg-white text-2xl font-black shadow">
            Done
          </button>
        </div>
      </div>
    )

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center gap-3 p-2">
        <button type="button" onClick={onExit} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold shrink-0" aria-label="Back">
          ←
        </button>
        <div className="flex-1 flex justify-center gap-2">
          {round.map((r, i) => (
            <span key={r.key} className={`w-3 h-3 rounded-full ${i < index ? 'bg-amber-400' : i === index ? 'bg-sky-500' : 'bg-slate-300'}`} />
          ))}
        </div>
        <div className="text-2xl font-black text-amber-500 w-16 text-right">★ {stars}</div>
      </div>
      {/* How far this item has faded, for a grown-up glancing over. */}
      <div className="mx-auto w-40 h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-label={`Fade step ${level[index] + 1} of ${TOP + 1}`}>
        <div className="h-full bg-sky-400" style={{ width: `${((level[index] + 1) / (TOP + 1)) * 100}%` }} />
      </div>
      <Page key={`${item.key}-${index}`} item={item} wrap={wrap} step={step} lines pen={pen} size="big" onDone={onDone} />
      {star && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-[9rem] leading-none text-amber-400 drop-shadow-xl animate-[pop_600ms_ease-out]">★</div>
        </div>
      )}
      <style>{`@keyframes pop { from { transform: scale(0.3); opacity: 0 } 60% { transform: scale(1.15); opacity: 1 } to { transform: scale(1) } }`}</style>
    </div>
  )
}
