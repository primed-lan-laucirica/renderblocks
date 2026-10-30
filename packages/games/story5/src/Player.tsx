/**
 * One player for every episode, with no player around it: the scene fills
 * the screen on its own paper, starts by itself, and carries straight on
 * into each interactive beat and out again, the way an animated app hands
 * over to the child. A single clock drives t; the scene draws that t and
 * nothing else. Sound cues and narration are scheduled on Web Audio from t.
 * At a beat the clock stops (a line being spoken finishes), the prompt is
 * spoken, and the child does the action; then it carries on.
 */
import { useEffect, useRef, useState } from 'react'
import type { Beat, SceneDef } from './engine/scene'
import { play as playCue } from './engine/tones'
import { loadClips, speak } from './engine/voice'
import { BeatOverlay } from './BeatOverlay'
import { INK, SANS } from './kit/sizes'

interface Props {
  scene: SceneDef
  /** Starts playing once this is true (after the zoom in). */
  go: boolean
  /** The moment its window showed: held until it starts, so the zoom in lands on the same picture. */
  still?: number
  onBeatDone: (id: string) => void
  /** The last frame has been held a moment. */
  onFinished: () => void
  onBack: () => void
  /** The 16:9 stage, for the zoom in and out. */
  stageRef?: React.Ref<HTMLDivElement>
}

/** Held on the last frame before it hands back. */
const HOLD_MS = 1200

export function Player({ scene, go, still = 0, onBeatDone, onFinished, onBack, stageRef }: Props) {
  const [t, setT] = useState(still)
  // The narration is loaded before it starts, so the first line isn't lost.
  const [loaded, setLoaded] = useState(false)
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
  // Beats done this time through (every viewing is his to do again).
  const doneRef = useRef(new Set<string>())
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
    if (!ctx) {
      queueMicrotask(() => setLoaded(true))
      return
    }
    let live = true
    void loadClips(ctx, [...scene.voice.map((v) => v.say), ...scene.beats.map((b) => b.say)]).then((m) => {
      if (!live) return
      audio.current.clips = m
      setLoaded(true)
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

  const start = (from: number) => {
    const at = from >= scene.duration ? 0 : from
    if (at === 0) finishedRef.current = false
    clock.current.t = at
    clock.current.last = performance.now()
    const ahead = nextBeat(at)
    schedule(at, ahead ? ahead.time : scene.duration + 1)
    setT(at)
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
        setBeat(b)
        sayPrompt(b)
        return
      }
      if (nt >= scene.duration) {
        c.t = scene.duration
        setT(scene.duration)
        if (!finishedRef.current) {
          finishedRef.current = true
          window.setTimeout(onFinished, HOLD_MS)
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

  // It starts by itself (once the zoom in has landed), and loads its voice first.
  const begun = useRef(false)
  useEffect(() => {
    if (!go || !loaded || begun.current) return
    begun.current = true
    // The window's picture dissolves into the opening.
    const el = sceneEl.current
    if (!el || still === 0) return start(0)
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).onfinish = () => {
      start(0)
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, loaded])

  const sceneEl = useRef<HTMLDivElement>(null)
  const { Scene } = scene
  return (
    <div className="h-dvh w-full relative overflow-hidden select-none">
      {/* The stage: 16:9, as large as the screen allows, on paper to the edges. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div ref={stageRef} className="relative" style={{ aspectRatio: '16 / 9', width: 'min(100vw, calc(100dvh * 16 / 9))', containerType: 'inline-size' }}>
          <div ref={sceneEl} className="absolute inset-0">
            <Scene t={t} beat={beat?.id} />
          </div>
          {/* His turn: the prompt as the scene's own words, on one line; a tap says it again. It sits under his pieces, so it never covers one. */}
          {beat && (
            <button
              type="button"
              onClick={() => sayPrompt(beat)}
              className="absolute left-1/2 -translate-x-1/2 top-[2.5%] whitespace-nowrap text-center"
              style={{ fontFamily: SANS, fontWeight: 700, color: INK, fontSize: '2.6cqw', lineHeight: 1.1, animation: 'story5-rise 600ms ease-out' }}
              aria-label={`Say it again: ${beat.prompt}`}
            >
              {beat.prompt}
            </button>
          )}
          {beat && <BeatOverlay beat={beat} onDone={finishBeat} />}
        </div>
      </div>
      <style>{`@keyframes story5-rise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }`}</style>
      {/* The only way out, faint in the corner (and Android back). */}
      <button type="button" onClick={onBack} className="absolute top-3 left-3 w-11 h-11 rounded-full text-2xl font-bold opacity-30 active:opacity-70" style={{ color: INK }} aria-label="Back">
        ←
      </button>
    </div>
  )
}
