/**
 * One player for every episode. A single clock drives t; the scene draws
 * that t and nothing else. Sound cues are scheduled on Web Audio from t, so
 * after a scrub or a pause they line up again. At an interactive beat the
 * clock stops and the child does the action; then it carries on.
 */
import { useEffect, useRef, useState } from 'react'
import type { Beat, SceneDef } from './engine/scene'
import { play as playCue } from './engine/tones'
import { BeatOverlay } from './BeatOverlay'

interface Props {
  scene: SceneDef
  /** Beats this child has already done (they don't stop playback again). */
  done: string[]
  onBeatDone: (id: string) => void
  onFinished: () => void
  onBack: () => void
}

export function Player({ scene, done, onBeatDone, onFinished, onBack }: Props) {
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState<Beat | null>(null)
  // The clock and the sound live outside React state (they change every frame).
  const clock = useRef({ t: 0, last: 0, raf: 0 })
  const audio = useRef<{ ctx: AudioContext | null; nodes: OscillatorNode[] }>({ ctx: null, nodes: [] })
  const doneRef = useRef(new Set(done))
  const finishedRef = useRef(false)

  const silence = () => {
    for (const n of audio.current.nodes) {
      try {
        n.stop()
      } catch {
        // already stopped
      }
    }
    audio.current.nodes = []
  }

  /** Every cue from `from` up to `until`, placed on the audio clock relative to now. */
  const schedule = (from: number, until: number) => {
    let ctx = audio.current.ctx
    try {
      ctx ??= new AudioContext()
    } catch {
      return
    }
    audio.current.ctx = ctx
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime + 0.03
    for (const e of scene.events) if (e.time >= from && e.time < until) audio.current.nodes.push(...playCue(ctx, e, now + (e.time - from)))
  }

  /** The next beat ahead of t that this child hasn't done. */
  const nextBeat = (from: number) => scene.beats.find((b) => b.time >= from - 1e-6 && !doneRef.current.has(b.id)) ?? null

  const stop = () => {
    cancelAnimationFrame(clock.current.raf)
    silence()
    setPlaying(false)
  }

  const start = (from: number) => {
    const at = from >= scene.duration ? 0 : from
    if (at === 0) finishedRef.current = false
    clock.current.t = at
    clock.current.last = performance.now()
    const ahead = nextBeat(at)
    schedule(at, ahead ? ahead.time : scene.duration + 1)
    setT(at)
    setPlaying(true)
    const tick = (now: number) => {
      const c = clock.current
      const nt = c.t + (now - c.last) / 1000
      c.last = now
      const b = nextBeat(c.t)
      if (b && nt >= b.time) {
        // The child's turn.
        c.t = b.time
        setT(b.time)
        silence()
        setPlaying(false)
        setBeat(b)
        return
      }
      if (nt >= scene.duration) {
        c.t = scene.duration
        setT(scene.duration)
        setPlaying(false)
        if (!finishedRef.current) {
          finishedRef.current = true
          onFinished()
        }
        return
      }
      c.t = nt
      setT(nt)
      c.raf = requestAnimationFrame(tick)
    }
    clock.current.raf = requestAnimationFrame(tick)
  }

  // Leaving: stop the clock and the sound.
  useEffect(
    () => () => {
      cancelAnimationFrame(clock.current.raf)
      for (const n of audio.current.nodes) {
        try {
          n.stop()
        } catch {
          // already stopped
        }
      }
      void audio.current.ctx?.close()
    },
    [],
  )

  const finishBeat = () => {
    if (!beat) return
    doneRef.current.add(beat.id)
    onBeatDone(beat.id)
    const resume = beat.resume
    setBeat(null)
    start(resume)
  }

  const scrub = (v: number) => {
    stop()
    setBeat(null)
    clock.current.t = v
    setT(v)
  }

  const { Scene } = scene
  const atEnd = t >= scene.duration - 1e-3
  return (
    <div className="h-dvh w-full flex flex-col items-center justify-center gap-3 p-3 select-none" style={{ background: '#1d1813', color: '#efe6d4' }}>
      <div className="w-full max-w-[1280px] flex items-center gap-3">
        <button type="button" onClick={onBack} className="w-11 h-11 rounded-full bg-white/10 text-2xl font-bold" aria-label="Back">
          ←
        </button>
        <div className="flex-1 text-lg font-bold opacity-80 truncate">
          {scene.number}. {scene.title}
        </div>
        {beat && <div className="text-xl font-black text-amber-300">{beat.prompt}</div>}
      </div>
      {/* The stage: 16:9, as large as fits. */}
      <div className="relative w-full max-w-[1280px] rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16 / 9', maxHeight: 'calc(100dvh - 9rem)' }}>
        <div className="absolute inset-0">
          <Scene t={t} beat={beat?.id} />
        </div>
        {beat && <BeatOverlay beat={beat} onDone={finishBeat} />}
      </div>
      <div className="w-full max-w-[1280px] flex items-center gap-3">
        <button
          type="button"
          disabled={!!beat}
          onClick={() => (playing ? stop() : start(t))}
          className="rounded-lg px-5 py-2 font-bold text-white disabled:opacity-40"
          style={{ background: '#c8643b', minWidth: 104 }}
        >
          {playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round((t / scene.duration) * 1000)}
          onChange={(e) => scrub((Number(e.target.value) / 1000) * scene.duration)}
          className="flex-1"
          style={{ accentColor: '#c8643b' }}
          aria-label="Scrub"
        />
        <span className="font-mono text-sm opacity-80 w-20 text-right tabular-nums">{t.toFixed(1)} s</span>
      </div>
    </div>
  )
}
