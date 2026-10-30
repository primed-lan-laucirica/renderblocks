/**
 * Story5: the Montessori Fifth Great Lesson (the Story of Numbers), then a
 * tour of K–4 arithmetic in six parts, shown entirely through manipulatives.
 * Episodes are the instruction; each part's workshop is where understanding
 * shows. Workshops are always open, never locked behind episodes.
 *
 * Home is a place, not a list: the bead chain (World). A tap on a window
 * zooms into it and the episode plays; at the end it zooms back out to the
 * chain, which glides on to what's next.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { EPISODES } from './episodes'
import { record } from './evidence'
import { PAPER } from './kit/sizes'
import { Player } from './Player'
import { load, save, type Progress } from './progress'
import { WORKSHOPS } from './workshops'
import { posterT, STOPS, type Stop } from './stops'
import { World, type WorldHandle } from './World'

const ZOOM_MS = 650
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'

/** What comes after this stop along the chain. */
const after = (id: string) => STOPS[STOPS.findIndex((s) => s.id === id) + 1]?.id ?? null

/** The first episode not yet watched (or the start). */
function firstNext(p: Progress) {
  const watched = new Set(p.watched)
  let last = -1
  STOPS.forEach((s, i) => {
    if (s.kind === 'episode' && watched.has(s.id)) last = i
  })
  return STOPS[last + 1]?.id ?? STOPS[0]?.id ?? null
}

/** The transform that puts `to` exactly over `from`. */
const over = (from: DOMRect, to: DOMRect) => `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`

function App({ services }: GameProps) {
  const [progress, setProgress] = useState<Progress>(() => load(services.storage))
  const [open, setOpen] = useState<{ stop: Stop; ready: boolean } | null>(null)
  const [next, setNext] = useState<string | null>(() => firstNext(load(services.storage)))
  const world = useRef<WorldHandle>(null)
  const layer = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const closing = useRef(false)

  const update = (p: Progress) => {
    setProgress(p)
    save(services.storage, p)
  }

  // What zooms: an episode's stage (it lands exactly on the window it came from), or a whole workshop.
  const zoomed = () => (open?.stop.kind === 'episode' ? stage.current : layer.current)

  // Going in: from the window to the whole screen, the paper filling in round it.
  useLayoutEffect(() => {
    if (!open || open.ready) return
    const from = world.current?.rectOf(open.stop.id)
    const el = zoomed()
    if (!from || !el) return setOpen({ ...open, ready: true })
    closing.current = false
    const to = el.getBoundingClientRect()
    el.style.transformOrigin = '0 0'
    el.animate([{ transform: over(from, to) }, { transform: 'none' }], { duration: ZOOM_MS, easing: EASE })
    paper.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ZOOM_MS, easing: EASE })
    const id = window.setTimeout(() => setOpen((o) => o && { ...o, ready: true }), ZOOM_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.stop.id])

  // Coming out: back into its window, then along the chain to what's next.
  const close = (then: string | null) => {
    if (!open || closing.current) return
    closing.current = true
    const id = open.stop.id
    const from = world.current?.rectOf(id)
    const el = zoomed()
    const done = () => {
      setOpen(null)
      if (then) {
        setNext(then)
        window.setTimeout(() => world.current?.glideTo(then), 250)
      }
    }
    if (!from || !el) return done()
    const to = el.getBoundingClientRect()
    el.style.transformOrigin = '0 0'
    const a = el.animate([{ transform: 'none' }, { transform: over(from, to) }], { duration: ZOOM_MS, easing: EASE, fill: 'forwards' })
    paper.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ZOOM_MS, easing: EASE, fill: 'forwards' })
    a.onfinish = done
  }

  // Android back: out of an episode or workshop to the chain; from the chain, out of the tile.
  const closeRef = useRef(close)
  useLayoutEffect(() => {
    closeRef.current = close
  })
  useEffect(() => services.onBack(() => (open ? (closeRef.current(null), true) : false)), [services, open])

  const stop = open?.stop
  const scene = stop?.kind === 'episode' ? EPISODES[stop.n] : null
  const Workshop = stop?.kind === 'workshop' ? WORKSHOPS[stop.part]?.View : null
  const partOf = stop?.part ?? 0

  return (
    <div className="h-dvh w-full relative overflow-hidden">
      <World
        ref={world}
        watched={new Set(progress.watched)}
        stars={progress.stars}
        next={next}
        covered={!!open}
        onOpen={(s) => {
          setNext(null)
          setOpen({ stop: s, ready: false })
        }}
        onExit={services.exitToHome}
      />
      {stop && (
        <div ref={layer} className="absolute inset-0 z-10">
          {/* What fills in round it: the episode's paper, or the workshop's own dark table. */}
          <div ref={paper} className="absolute inset-0" style={{ background: stop.kind === 'episode' ? PAPER : '#1d1813' }} />
          {scene && (
            <Player
              key={scene.id}
              scene={scene}
              go={!!open?.ready}
              still={posterT(scene)}
              stageRef={stage}
              onBeatDone={(id) => {
                update({ ...progress, beats: [...new Set([...progress.beats, `${scene.id}:${id}`])] })
                record(services.shared, { stream: 'watched', part: partOf, item: `${scene.id}:${id}` })
              }}
              onFinished={() => {
                const p = load(services.storage)
                update({ ...p, watched: [...new Set([...p.watched, scene.id])] })
                record(services.shared, { stream: 'watched', part: partOf, item: scene.id })
                close(after(scene.id))
              }}
              onBack={() => close(null)}
            />
          )}
          {/* Positioned, so it sits above the fill (a workshop's own screen may not be). */}
          {Workshop && stop.kind === 'workshop' && (
            <div className="relative h-full w-full">
            <Workshop
              services={services}
              onBack={() => close(null)}
              onStar={() => update({ ...progress, stars: [...new Set([...progress.stars, stop.part])] })}
            />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
