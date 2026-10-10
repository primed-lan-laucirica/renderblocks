/**
 * The export page (render.html): one scene at 1920 × 1080, drawn at whatever
 * t the export script asks for. Never part of the app.
 *   window.seek(t)       draw the frame at t (resolves once it's on screen)
 *   window.DURATION      the scene's length
 *   window.IDS           every scene's id
 *   window.soundtrack()  the cues and narration rendered offline, as a base64 WAV
 *                        (watched straight through: no beat stops it)
 */
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { ALL_SCENES } from './episodes'
import { play } from './engine/tones'
import { loadClips, speak } from './engine/voice'

const id = new URLSearchParams(location.search).get('ep') ?? 'ep0'
const scene = ALL_SCENES.find((s) => s.id === id) ?? ALL_SCENES[0]
const root = createRoot(document.getElementById('stage')!)
const { Scene } = scene

const w = window as unknown as {
  seek: (t: number) => Promise<void>
  DURATION: number
  EVENTS: unknown
  IDS: string[]
  soundtrack: () => Promise<string>
}
w.DURATION = scene.duration
w.IDS = ALL_SCENES.map((s) => s.id)
w.EVENTS = scene.events
w.seek = (t) =>
  new Promise((done) => {
    // A fresh tree every frame (keyed by t): Chrome then paints the whole frame, not just
    // what changed, so a frame's pixels never depend on the frame drawn before it.
    flushSync(() => root.render(<Scene key={t} t={t} />))
    requestAnimationFrame(() => requestAnimationFrame(() => done()))
  })

/** The soundtrack: every cue and line, on an offline context, as 16-bit stereo WAV. */
w.soundtrack = async () => {
  const rate = 48000
  const ctx = new OfflineAudioContext(2, Math.ceil((scene.duration + 2) * rate), rate)
  for (const e of scene.events) play(ctx, e, e.time)
  const clips = await loadClips(
    ctx,
    scene.voice.map((v) => v.say),
  )
  for (const v of scene.voice) {
    const buf = clips.get(v.say)
    if (buf) speak(ctx, buf, v.time)
  }
  const buf = await ctx.startRendering()
  const n = buf.length
  const out = new DataView(new ArrayBuffer(44 + n * 4))
  const str = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  out.setUint32(4, 36 + n * 4, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  out.setUint32(16, 16, true)
  out.setUint16(20, 1, true)
  out.setUint16(22, 2, true)
  out.setUint32(24, rate, true)
  out.setUint32(28, rate * 4, true)
  out.setUint16(32, 4, true)
  out.setUint16(34, 16, true)
  str(36, 'data')
  out.setUint32(40, n * 4, true)
  const l = buf.getChannelData(0)
  const r = buf.getChannelData(1)
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, l[i])) * 32767, true)
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, r[i])) * 32767, true)
  }
  let bin = ''
  const bytes = new Uint8Array(out.buffer)
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

void w.seek(0)
