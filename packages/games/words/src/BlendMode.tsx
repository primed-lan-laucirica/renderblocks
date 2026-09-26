import { useEffect, useRef, useState } from 'react'
import { playBlend, playSound, playWord, type Voice } from './audio'
import { PartLetters, WORD_FONT } from './WordParts'
import type { Word } from './words'

/** Push a tile this close to its neighbour and they join. */
const JOIN_PX = 14

/**
 * The parts start apart as tiles. Tap a tile to hear it; push tiles together
 * and they join, saying their sounds run together; when they are all one
 * piece, the whole word is said.
 */
export function BlendMode({ word }: { word: Word }) {
  const split = () => word.parts.map((_, i) => [i])
  const [groups, setGroups] = useState<number[][]>(split)
  const [drag, setDrag] = useState<{ group: number; startX: number; dx: number } | null>(null)
  const refs = useRef<Array<HTMLDivElement | null>>([])
  const voice = useRef<Voice | null>(null)

  // (Remounted for each word, so it always starts fresh.)
  useEffect(() => () => voice.current?.stop(), [])

  const sounds = (g: number[]) => g.map((i) => word.parts[i].sound).filter((s): s is string => !!s)

  const join = (a: number, b: number) => {
    const merged = [...groups[a], ...groups[b]]
    const next = [...groups.slice(0, a), merged, ...groups.slice(b + 1)]
    setGroups(next)
    setDrag(null)
    voice.current?.stop(0.03)
    voice.current = next.length === 1 ? playWord(word.word) : playBlend(sounds(merged))
  }

  const move = (clientX: number) => {
    if (!drag) return
    const dx = clientX - drag.startX
    const me = refs.current[drag.group]?.getBoundingClientRect()
    const left = refs.current[drag.group - 1]?.getBoundingClientRect()
    const right = refs.current[drag.group + 1]?.getBoundingClientRect()
    if (me && left && me.left + (dx - drag.dx) - left.right < JOIN_PX) return join(drag.group - 1, drag.group)
    if (me && right && right.left - (me.right + (dx - drag.dx)) < JOIN_PX) return join(drag.group, drag.group + 1)
    setDrag({ ...drag, dx })
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-end gap-10" style={{ touchAction: 'none' }}>
        {groups.map((g, gi) => (
          <div
            key={g.join('-')}
            ref={(el) => void (refs.current[gi] = el)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              setDrag({ group: gi, startX: e.clientX, dx: 0 })
              voice.current?.stop(0.03)
              voice.current = g.length === word.parts.length ? playWord(word.word) : g.length === 1 ? playSound(word.parts[g[0]].sound) : playBlend(sounds(g))
            }}
            onPointerMove={(e) => move(e.clientX)}
            onPointerUp={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
            className={`flex items-end rounded-3xl px-4 pb-4 pt-6 border-4 shadow-md ${WORD_FONT} ${
              groups.length === 1 ? 'bg-emerald-100 border-emerald-300' : 'bg-white border-sky-200'
            }`}
            style={{ transform: drag?.group === gi ? `translateX(${drag.dx}px)` : undefined }}
          >
            {g.map((i) => (
              <PartLetters key={i} part={word.parts[i]} />
            ))}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setGroups(split())}
        className="px-5 py-2 rounded-2xl bg-white/80 text-slate-600 text-2xl font-black shadow"
        aria-label="Split the word again"
      >
        ↔︎
      </button>
    </div>
  )
}
