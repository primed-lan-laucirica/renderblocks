/**
 * Symbols: what the signs say. One short animated explainer per sign (or
 * family of signs), in the order of the learning path, so no sign is ever
 * used before it has been met. Each stage has a Bench, where the signs he
 * has met are his to write with.
 *
 * Home is a place, not a list: the symbol road (Road). A tap on a window
 * picks it, another zooms into it and the explainer plays; at the end it
 * zooms back out to the road, which glides on to what's next.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { ZOOM_MS, zoomIn, zoomOut } from '@renderblocks/scene/zoom'
import { Bench } from './bench/Bench'
import { Cover } from './Cover'
import { signsOf, STAGES } from './data/path'
import { record } from './evidence'
import { EXPLAINERS, explainerOf } from './explainers'
import { PAPER } from './kit/look'
import { Player } from './Player'
import { load, save, type Progress } from './progress'
import { Road, stops, type RoadHandle, type Stop } from './Road'

/** Ranks that have an explainer, and stages that have a Bench (a stage gets its Bench once it has explainers). */
const BUILT = new Set(EXPLAINERS.map((e) => e.rank))
const BENCHES = STAGES.filter((s) => s.ranks.some((r) => BUILT.has(r))).map((s) => s.n)
const STOPS = stops(BENCHES)
const opens = (s: Stop) => s.kind === 'bench' || BUILT.has(s.rank)

/** The next stop along the road that opens. */
const after = (id: string) => STOPS.slice(STOPS.findIndex((s) => s.id === id) + 1).find(opens)?.id ?? null

/** The first explainer not yet watched (or, all watched, nothing). */
const firstNext = (p: Progress) => STOPS.find((s) => s.kind === 'rank' && BUILT.has(s.rank) && !p.watched.includes(s.rank))?.id ?? null

/** A stage's Mastery run opens when every explainer the stage has so far is watched. */
const masteryOpen = (stage: number, p: Progress) => (STAGES.find((s) => s.n === stage)?.ranks ?? []).filter((r) => BUILT.has(r)).every((r) => p.watched.includes(r))

function App({ services }: GameProps) {
  const [progress, setProgress] = useState<Progress>(() => load(services.storage))
  const [open, setOpen] = useState<{ stop: Stop; ready: boolean } | null>(null)
  const [next, setNext] = useState<string | null>(() => firstNext(load(services.storage)))
  const road = useRef<RoadHandle>(null)
  const layer = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const closing = useRef(false)

  const update = (p: Progress) => {
    setProgress(p)
    save(services.storage, p)
  }

  // What zooms: an explainer's stage (it lands exactly on the window it came from), or the whole Bench.
  const zoomed = () => (open?.stop.kind === 'rank' ? stage.current : layer.current)

  // Going in: from the window to the whole screen, the paper filling in round it.
  useLayoutEffect(() => {
    if (!open || open.ready) return
    const from = road.current?.rectOf(open.stop.id)
    const el = zoomed()
    if (!from || !el) return setOpen({ ...open, ready: true })
    closing.current = false
    zoomIn(el, from, paper.current)
    const id = window.setTimeout(() => setOpen((o) => o && { ...o, ready: true }), ZOOM_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.stop.id])

  // Coming out: back into its window, then along the road to what's next.
  const close = (then: string | null) => {
    if (!open || closing.current) return
    closing.current = true
    const from = road.current?.rectOf(open.stop.id)
    const el = zoomed()
    const done = () => {
      setOpen(null)
      if (then) {
        setNext(then)
        window.setTimeout(() => road.current?.glideTo(then), 250)
      }
    }
    if (!from || !el) return done()
    zoomOut(el, from, paper.current, done)
  }

  // Android back: out of an explainer or the Bench to the road; from the road, out of the tile.
  const closeRef = useRef(close)
  useLayoutEffect(() => {
    closeRef.current = close
  })
  useEffect(() => services.onBack(() => (open ? (closeRef.current(null), true) : false)), [services, open])

  const stop = open?.stop
  const scene = stop?.kind === 'rank' ? explainerOf(stop.rank) : null

  return (
    <div className="h-dvh w-full relative overflow-hidden">
      <Road
        ref={road}
        built={BUILT}
        benches={BENCHES}
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
          <div ref={paper} className="absolute inset-0" style={{ background: PAPER }} />
          {scene && stop.kind === 'rank' && (
            <Player
              key={scene.id}
              scene={scene}
              go={!!open?.ready}
              cover={<Cover rank={scene.rank} />}
              stageRef={stage}
              onTurnDone={(id) => {
                update({ ...progress, turns: [...new Set([...progress.turns, `${scene.id}:${id}`])] })
                record(services.shared, { stream: 'watched', stage: stop.stage, item: `${scene.id}:${id}` })
              }}
              onFinished={() => {
                const p = load(services.storage)
                const done = { ...p, watched: [...new Set([...p.watched, scene.rank])] }
                update(done)
                record(services.shared, { stream: 'watched', stage: stop.stage, item: scene.id })
                // On to the next explainer; after the last one, to the stage's Bench.
                close(firstNext(done) ?? after(stop.id))
              }}
              onBack={() => close(null)}
            />
          )}
          {stop.kind === 'bench' && (
            <div className="relative h-full w-full">
              <Bench
                services={services}
                stage={stop.stage}
                signs={progress.watched.flatMap(signsOf)}
                mastery={masteryOpen(stop.stage, progress)}
                starred={progress.stars.includes(stop.stage)}
                onStar={() => update({ ...progress, stars: [...new Set([...progress.stars, stop.stage])] })}
                onBack={() => close(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
