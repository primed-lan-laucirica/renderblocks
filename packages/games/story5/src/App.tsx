/**
 * Story5: the Montessori Fifth Great Lesson (the Story of Numbers), then a
 * tour of K–4 arithmetic in six parts, shown entirely through manipulatives.
 * Episodes are the instruction; each part's workshop is where understanding
 * shows. Workshops are always open, never locked behind episodes.
 */
import { useEffect, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { PARTS } from './curriculum'
import { EPISODES } from './episodes'
import { record } from './evidence'
import { Player } from './Player'
import { load, save, type Progress } from './progress'
import { BeadBank } from './workshops/BeadBank'

type View = { kind: 'home' } | { kind: 'episode'; n: number } | { kind: 'workshop'; part: number }

/** Workshops built so far. */
const WORKSHOPS: Record<number, true> = { 2: true }

function App({ services }: GameProps) {
  const [view, setView] = useState<View>({ kind: 'home' })
  const [progress, setProgress] = useState<Progress>(() => load(services.storage))

  const update = (p: Progress) => {
    setProgress(p)
    save(services.storage, p)
  }

  // Android back: from an episode or workshop, back to the parts; from the parts, out of the tile.
  useEffect(() => services.onBack(() => (view.kind === 'home' ? false : (setView({ kind: 'home' }), true))), [services, view.kind])

  if (view.kind === 'episode') {
    const scene = EPISODES[view.n]
    const partOf = PARTS.find((p) => p.episodes.some((e) => e.n === view.n))?.n ?? 0
    return (
      <Player
        key={scene.id}
        scene={scene}
        done={progress.beats.filter((b) => b.startsWith(`${scene.id}:`)).map((b) => b.split(':')[1])}
        onBeatDone={(id) => {
          update({ ...progress, beats: [...new Set([...progress.beats, `${scene.id}:${id}`])] })
          record(services.shared, { stream: 'watched', part: partOf, item: `${scene.id}:${id}` })
        }}
        onFinished={() => {
          update({ ...load(services.storage), watched: [...new Set([...progress.watched, scene.id])] })
          record(services.shared, { stream: 'watched', part: partOf, item: scene.id })
        }}
        onBack={() => setView({ kind: 'home' })}
      />
    )
  }

  if (view.kind === 'workshop')
    return (
      <BeadBank
        services={services}
        onBack={() => setView({ kind: 'home' })}
        onStar={() => update({ ...progress, stars: [...new Set([...progress.stars, view.part])] })}
      />
    )

  const watched = new Set(progress.watched)
  return (
    <div className="h-dvh w-full overflow-y-auto p-3 select-none" style={{ background: '#1d1813', color: '#efe6d4' }}>
      <div className="flex items-center gap-3 mb-3">
        <button type="button" onClick={services.exitToHome} className="w-11 h-11 rounded-full bg-white/10 text-2xl font-bold" aria-label="Home">
          ←
        </button>
        <h1 className="text-3xl font-black" style={{ fontFamily: "Georgia, 'DejaVu Serif', serif" }}>
          The Story of Numbers
        </h1>
      </div>
      <button
        type="button"
        onClick={() => setView({ kind: 'episode', n: 0 })}
        className="w-full rounded-2xl p-4 mb-3 text-left font-black text-2xl"
        style={{ background: '#c8643b', color: '#fff' }}
      >
        0 · The Story of Numbers {watched.has('ep0') ? '✓' : ''}
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PARTS.map((part) => (
          <div key={part.n} className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: '#2a231c' }}>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black">
                Part {part.n}: {part.title}
              </span>
              <span className="text-sm font-bold opacity-60">{part.grades}</span>
              {progress.stars.includes(part.n) && <span className="ml-auto text-2xl">⭐</span>}
            </div>
            <div className="flex flex-col gap-1">
              {part.episodes.map((e) => {
                const built = !!EPISODES[e.n]
                return (
                  <button
                    key={e.n}
                    type="button"
                    disabled={!built}
                    onClick={() => setView({ kind: 'episode', n: e.n })}
                    className={`text-left rounded-lg px-3 py-1.5 font-bold ${built ? 'bg-white/10 active:bg-white/20' : 'opacity-35'}`}
                  >
                    <span className="tabular-nums opacity-70 mr-2">{e.n}</span>
                    {e.title} {watched.has(`ep${e.n}`) ? '✓' : ''}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              disabled={!WORKSHOPS[part.n]}
              onClick={() => setView({ kind: 'workshop', part: part.n })}
              className={`rounded-lg px-3 py-2 font-black text-left ${WORKSHOPS[part.n] ? 'bg-amber-500 text-slate-900' : 'bg-white/5 opacity-40'}`}
            >
              🛠 {part.workshop}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
