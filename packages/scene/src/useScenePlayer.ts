/**
 * The clock and the sound of a scene, with no player around them: a single
 * clock drives t, and the scene draws that t and nothing else. Sound cues and
 * narration are scheduled on Web Audio from t. At a beat the clock stops (a
 * line being spoken finishes), the prompt is spoken, and the child does the
 * action; then it carries on. At the end the last frame is held a moment.
 */
import { useEffect, useRef, useState } from 'react'
import type { Beat, SceneDef } from './scene'
import { play as playCue } from './tones'
import { speak, type VoiceBank } from './voice'

/** Held on the last frame before it hands back. */
export const HOLD_MS = 1200

interface Options {
  /** The moment it shows before it starts. */
  still?: number
  /** The last frame has been held a moment. */
  onFinished: () => void
  /** How long the last frame is held before onFinished (default HOLD_MS). */
  holdMs?: number
}

export function useScenePlayer(scene: SceneDef, voice: VoiceBank, { still = 0, onFinished, holdMs = HOLD_MS }: Options) {
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
  const onFinishedRef = useRef(onFinished)
  useEffect(() => {
    onFinishedRef.current = onFinished
  })

  const context = () => {
    try {
      audio.current.ctx ??= new AudioContext()
    } catch {
      return null
    }
    return audio.current.ctx
  }

  // The narration's clips, decoded once per scene.
  useEffect(() => {
    const ctx = context()
    if (!ctx) {
      queueMicrotask(() => setLoaded(true))
      return
    }
    let live = true
    void voice.loadClips(ctx, [...scene.voice.map((v) => v.say), ...scene.beats.map((b) => b.say)]).then((m) => {
      if (!live) return
      audio.current.clips = m
      setLoaded(true)
    })
    return () => {
      live = false
    }
  }, [scene, voice])

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
          window.setTimeout(() => onFinishedRef.current(), holdMs)
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

  /** The child finished the beat: carry on from its resume point. Returns its id. */
  const finishBeat = () => {
    if (!beat) return null
    doneRef.current.add(beat.id)
    const { id, resume } = beat
    setBeat(null)
    start(resume)
    return id
  }

  return { t, beat, loaded, start, finishBeat, sayPrompt }
}
