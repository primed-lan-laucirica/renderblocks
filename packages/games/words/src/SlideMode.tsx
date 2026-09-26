import { useRef, useState } from 'react'
import { playWord } from './audio'
import { PartLetters, WORD_FONT } from './WordParts'
import type { Word } from './words'

const THUMB = 64

/**
 * Slide a thumb along under the word and each part lights up as the thumb
 * reaches it — silently. Saying the sounds is his job (as Reading.com does);
 * an app voice here did the reading for him. Tapping the word says it.
 */
export function SlideMode({ word }: { word: Word }) {
  const partRefs = useRef<Array<HTMLSpanElement | null>>([])
  const trackRef = useRef<HTMLDivElement>(null)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [lit, setLit] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const current = useRef<number | null>(null)
  const finished = useRef(false)


  const enter = (i: number | null) => {
    if (i === current.current) return
    current.current = i
    setLit(i)
  }

  const move = (clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const r = track.getBoundingClientRect()
    const nx = Math.min(r.width, Math.max(0, clientX - r.left))
    setX(nx)
    // Which part is the thumb under?
    const cx = r.left + nx
    let found: number | null = null
    partRefs.current.forEach((el, i) => {
      if (!el) return
      const pr = el.getBoundingClientRect()
      if (cx >= pr.left && cx < pr.right) found = i
    })
    const last = partRefs.current[word.parts.length - 1]?.getBoundingClientRect()
    if (last && cx >= last.right) {
      enter(null)
      // Off the end: the whole word lights up — still no voice.
      if (!finished.current) {
        finished.current = true
        setDone(true)
      }
      return
    }
    enter(found)
  }

  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    finished.current = false
    setDone(false)
    setDragging(true)
    move(e.clientX)
  }
  const up = () => {
    setDragging(false)
    current.current = null
    setLit(null)
    // Back to the start for another go.
    window.setTimeout(() => setX(0), finished.current ? 900 : 150)
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <button
        type="button"
        onClick={() => playWord(word.word)}
        aria-label={`Say ${word.word}`}
        className={`flex items-end ${WORD_FONT} ${done ? 'animate-pulse' : ''}`}
      >
        {word.parts.map((p, i) => (
          <PartLetters key={i} part={p} lit={lit === i || done} ref={(el) => void (partRefs.current[i] = el)} />
        ))}
      </button>
      <div
        ref={trackRef}
        className="relative h-6 rounded-full bg-sky-200"
        style={{ width: 'min(90vw, 44rem)', touchAction: 'none' }}
        onPointerDown={down}
        onPointerMove={(e) => dragging && move(e.clientX)}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div
          className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-sky-500 border-4 border-white shadow-lg ${
            dragging ? '' : 'transition-[left] duration-500'
          }`}
          style={{ width: THUMB, height: THUMB, left: x - THUMB / 2 }}
        />
      </div>
    </div>
  )
}
