/**
 * One player for every episode. A single clock drives t; the scene draws
 * that t and nothing else. Sound cues are scheduled on Web Audio from t, so
 * after a scrub or a pause they line up again; so is the narration. At an
 * interactive beat the clock stops (a line being spoken finishes), the
 * prompt is spoken, and the child does the action; then it carries on.
 */
import { useEffect, useRef, useState } from 'react'
import type { Beat, SceneDef } from './engine/scene'
import { play as playCue } from './engine/tones'
import { clip, loadClips, speak } from './engine/voice'
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
  const audio = useRef<{ ctx: AudioContext | null; nodes: OscillatorNode[]; voice: AudioBufferSourceNode[]; clips: Map<string, AudioBuffer>; quietAt: number }>({
    ctx: null,
    nodes: [],
    voice: [],
    clips: new Map(),
    quietAt: 0,
  })
  const doneRef = useRef(new Set(done))
  const finishedRef = useRef(false)

  const context = () => {
    try {
      audio.current.ctx ??= new AudioContext()
    } catch {
      return null
    }
    return audio.current.ctx
  }

  // The narration's clips, decoded once per episode.
  useEffect(() => {
    const ctx = context()
    if (!ctx) return
    let live = true
    void loadClips(ctx, [...scene.voice.map((v) => v.say), ...scene.beats.map((b) => b.say)]).then((m) => {
      if (live) audio.current.clips = m
    })
    return () => {
      live = false
    }
  }, [scene])

  const stopAll = (nodes: AudioScheduledSourceNode[]) => {
    for (const n of nodes) {
      try {
        n.stop()
      } catch {
        // already stopped
      }
    }
  }
  /** Stop the cues; `voice` also stops the narration (a pause or a scrub, not a beat). */
  const silence = (voice = true) => {
    stopAll(audio.current.nodes)
    audio.current.nodes = []
    if (voice) {
      stopAll(audio.current.voice)
      audio.current.voice = []
      audio.current.quietAt = 0
    }
  }

  /** Every cue and line from `from` up to `until`, placed on the audio clock relative to now. */
  const schedule = (from: number, until: number) => {
    const ctx = context()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime + 0.03
    for (const e of scene.events) if (e.time >= from && e.time < until) audio.current.nodes.push(...playCue(ctx, e, now + (e.time - from)))
    for (const v of scene.voice) {
      const buf = audio.current.clips.get(v.say)
      if (!buf || v.time >= until || v.time + buf.duration <= from) continue
      // A line already under way (after a scrub) picks up mid-sentence.
      const off = Math.max(0, from - v.time)
      const at = now + Math.max(0, v.time - from)
      audio.current.voice.push(speak(ctx, buf, at, off))
      audio.current.quietAt = Math.max(audio.current.quietAt, at + buf.duration - off)
    }
  }

  /** Speak a beat's prompt, after whatever's being said now. */
  const sayPrompt = (b: Beat) => {
    const ctx = context()
    const buf = audio.current.clips.get(b.say)
    if (!ctx || !buf) return
    stopAll(audio.current.voice.filter((v) => v.buffer === buf))
    const at = Math.max(ctx.currentTime + 0.05, audio.current.quietAt + 0.3)
    audio.current.voice.push(speak(ctx, buf, at))
    audio.current.quietAt = at + buf.duration
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
        silence(false)
        setPlaying(false)
        setBeat(b)
        sayPrompt(b)
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
      const ctx = audio.current.ctx
      audio.current.ctx = null
      void ctx?.close().catch(() => {})
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

  // The controls float over the episode; while it plays they fade out, and a tap brings them back.
  const [controls, setControls] = useState(true)
  const hideTimer = useRef(0)
  const poke = () => {
    setControls(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setControls(false), 2500)
  }
  useEffect(() => () => window.clearTimeout(hideTimer.current), [])
  const play = () => {
    poke()
    start(t)
  }

  const { Scene } = scene
  const atEnd = t >= scene.duration - 1e-3
  const shown = controls || !playing
  const fade = `transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0 pointer-events-none'}`
  return (
    <div className="h-dvh w-full relative overflow-hidden select-none" style={{ background: '#1d1813', color: '#efe6d4' }}>
      {/* The stage: 16:9, as large as the screen allows. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ aspectRatio: '16 / 9', width: 'min(100vw, calc(100dvh * 16 / 9))' }}>
          <div className="absolute inset-0" onClick={() => (playing ? poke() : undefined)}>
            <Scene t={t} beat={beat?.id} />
          </div>
          {beat && <BeatOverlay beat={beat} onDone={finishBeat} />}
          {/* Paused: one big button in the middle. */}
          {!playing && !beat && (
            <button
              type="button"
              onClick={play}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full text-6xl text-white shadow-2xl flex items-center justify-center"
              style={{ background: 'rgba(200, 100, 59, 0.9)' }}
              aria-label={atEnd ? 'Replay' : 'Play'}
            >
              {atEnd ? '↻' : '▶'}
            </button>
          )}
        </div>
      </div>

      {/* Top: back and title; the beat's prompt stays up while it's his turn. */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-3 p-3 pointer-events-none" style={{ background: shown ? 'linear-gradient(rgba(29,24,19,0.75), transparent)' : undefined }}>
        <button type="button" onClick={onBack} className={`w-11 h-11 rounded-full bg-black/40 text-2xl font-bold pointer-events-auto ${fade}`} aria-label="Back">
          ←
        </button>
        <div className={`flex-1 text-lg font-bold truncate ${fade}`}>
          <span style={{ opacity: 0.8 }}>
            {scene.number}. {scene.title}
          </span>
        </div>
        {beat && (
          <button
            type="button"
            onClick={() => sayPrompt(beat)}
            className="rounded-full bg-black/60 px-4 py-2 text-xl font-black text-amber-300 pointer-events-auto"
            aria-label={`Say it again: ${beat.prompt}`}
          >
            {clip(beat.say) ? '🔊 ' : ''}
            {beat.prompt}
          </button>
        )}
      </div>

      {/* Bottom: play/pause, the scrubber, the time. */}
      <div className={`absolute inset-x-0 bottom-0 flex items-center gap-3 p-3 ${fade}`} style={{ background: 'linear-gradient(transparent, rgba(29,24,19,0.8))' }}>
        <button
          type="button"
          disabled={!!beat}
          onClick={() => (playing ? stop() : play())}
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
          onChange={(e) => {
            scrub((Number(e.target.value) / 1000) * scene.duration)
          }}
          className="flex-1"
          style={{ accentColor: '#c8643b' }}
          aria-label="Scrub"
        />
        <span className="font-mono text-sm opacity-80 w-20 text-right tabular-nums">{t.toFixed(1)} s</span>
      </div>
    </div>
  )
}
