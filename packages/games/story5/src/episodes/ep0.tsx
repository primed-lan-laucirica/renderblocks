/* eslint-disable react-refresh/only-export-components -- by the scene contract, a scene module exports its component together with its duration and timeline */
/**
 * Episode 0: the Story of Numbers. A faithful port of Drive
 * `Story5/scene.html` to the scene contract: the same timings, drawings,
 * captions and sound cues, drawn on a canvas as a pure function of t.
 */
import { useLayoutEffect, useRef } from 'react'
import { clamp, lerp, outBack, outCubic, p, rng, smooth, win } from '../engine/ease'
import type { SceneDef, SceneEvent } from '../engine/scene'

const DURATION = 54
const W = 1920
const H = 1080

const C = {
  paper: '#efe6d4',
  paper2: '#e6d9bf',
  ink: '#3b2f25',
  soft: '#7a6a58',
  terra: '#c8643b',
  ochre: '#d9a441',
  sage: '#7f9a6a',
  sky: '#6f97b3',
  plum: '#8a5a7a',
  bone: '#f3ead6',
  grass: '#a7b97f',
  hill: '#8fa56b',
}
const SERIF = "Georgia, 'GFS Baskerville', 'DejaVu Serif', serif"
const SANS = "Inter, system-ui, 'DejaVu Sans', sans-serif"

// Timed events (also the soundtrack).
const EVENTS: SceneEvent[] = []
const ev = (time: number, kind: SceneEvent['kind'], n: number) => EVENTS.push({ time, kind, n })

const T = { title: [0, 6.2], sheep: [6, 16.4], bone: [16.2, 25.4], five: [25.2, 37.4], zero: [37.2, 46.4], today: [46.2, 54] } as const
const SHEEP_T = [8.2, 9.6, 11.0, 12.4, 13.8]
SHEEP_T.forEach((s, i) => ev(s + 0.9, 'pebble', i))
const NOTCH_T = [17.6, 18.2, 18.8, 19.4, 20.0, 21.0, 21.6, 22.2]
NOTCH_T.forEach((s, i) => ev(s, 'notch', i))
const CARD_T = [27.0, 28.6, 30.2, 31.8, 33.6]
CARD_T.forEach((s, i) => ev(s, 'card', i))
ev(39.0, 'zero', 0)
ev(42.0, 'place', 1)
ev(43.6, 'place', 2)
const DIGIT_T = [...Array(10)].map((_, i) => 47.4 + i * 0.28)
DIGIT_T.forEach((s, i) => ev(s, 'digit', i))

/** Everything drawn into one 2D context, as a pure function of t. */
export function draw(ctx: CanvasRenderingContext2D, tIn: number) {
  const t = clamp(tIn, 0, DURATION)

  function bg() {
    ctx.fillStyle = C.paper
    ctx.fillRect(0, 0, W, H)
    const r = rng(7)
    ctx.fillStyle = 'rgba(120,95,60,0.05)'
    for (let i = 0; i < 900; i++) ctx.fillRect(r() * W, r() * H, 2, 2)
    const gr = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95)
    gr.addColorStop(0, 'rgba(0,0,0,0)')
    gr.addColorStop(1, 'rgba(90,60,30,0.18)')
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, W, H)
  }
  function text(s: string, x: number, y: number, { size = 60, font = SANS, weight = 600, color = C.ink, align = 'center' as CanvasTextAlign, alpha = 1 } = {}) {
    if (alpha <= 0) return
    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.font = `${weight} ${size}px ${font}`
    ctx.fillText(s, x, y)
    ctx.restore()
  }
  function caption(s: string, start: number, end: number, y = 930) {
    const a = smooth(p(t, start, start + 0.7)) * (1 - smooth(p(t, end - 0.5, end)))
    if (a <= 0) return
    text(s, W / 2, y + (1 - a) * 18, { size: 54, weight: 600, alpha: a })
  }
  function pebble(x: number, y: number, r: number, color: string, alpha = 1, seed = 1) {
    if (alpha <= 0) return
    const q = rng(seed)
    const sx = 1 + q() * 0.25
    const sy = 0.78 + q() * 0.12
    const rot = (q() - 0.5) * 0.8
    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.fillStyle = 'rgba(60,40,20,0.18)'
    ctx.beginPath()
    ctx.ellipse(4, r * 0.55, r * sx, r * sy * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(0, 0, r * sx, r * sy, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.3, -r * 0.3, r * 0.32, r * 0.2, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  function sheep(x: number, y: number, s: number, phase: number) {
    const bob = Math.sin(phase) * 4
    ctx.save()
    ctx.translate(x, y + bob)
    ctx.scale(s, s)
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    const k = Math.sin(phase) * 8
    ;[
      [-30, k],
      [-12, -k],
      [14, k],
      [30, -k],
    ].forEach(([lx, o]) => {
      ctx.beginPath()
      ctx.moveTo(lx, 20)
      ctx.lineTo(lx + o * 0.6, 58)
      ctx.stroke()
    })
    ctx.fillStyle = '#fbf7ee'
    ;[
      [-34, 0, 26],
      [-12, -14, 28],
      [14, -14, 28],
      [34, 0, 26],
      [0, 6, 32],
      [-20, 12, 24],
      [20, 12, 24],
    ].forEach(([cx, cy, r]) => {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.strokeStyle = 'rgba(59,47,37,0.25)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(0, 2, 58, 34, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.beginPath()
    ctx.ellipse(62, -10, 20, 16, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(52, -24, 9, 5, -0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(68, -14, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function sceneTitle() {
    const a = win(t, T.title[0], T.title[1])
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    const ty = outCubic(p(t, 0.3, 1.6))
    text('The Story of Numbers', W / 2, 430 + (1 - ty) * 30, { size: 132, font: SERIF, weight: 700, alpha: ty })
    text('one of the Great Lessons', W / 2, 545, { size: 44, weight: 500, color: C.soft, alpha: smooth(p(t, 1.4, 2.2)) })
    const cols = [C.terra, C.ochre, C.sage, C.sky, C.plum]
    for (let i = 0; i < 10; i++) {
      const s = 2.2 + i * 0.18
      const k = outBack(p(t, s, s + 0.6))
      pebble(W / 2 - 405 + i * 90, 700 - (1 - k) * 40, 26 * k + 0.01, cols[i % 5], smooth(p(t, s, s + 0.2)), 11 + i)
    }
    ctx.restore()
  }

  function sceneSheep() {
    const [a0, a1] = T.sheep
    const a = win(t, a0, a1)
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = '#dfe7e4'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = C.grass
    ctx.beginPath()
    ctx.moveTo(0, 640)
    ctx.bezierCurveTo(500, 560, 1200, 620, W, 580)
    ctx.lineTo(W, H)
    ctx.lineTo(0, H)
    ctx.fill()
    ctx.fillStyle = C.hill
    ctx.beginPath()
    ctx.moveTo(0, 760)
    ctx.bezierCurveTo(600, 700, 1300, 760, W, 720)
    ctx.lineTo(W, H)
    ctx.lineTo(0, H)
    ctx.fill()
    ctx.fillStyle = C.ochre
    ctx.beginPath()
    ctx.arc(1660, 190, 70, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8b6a4a'
    ctx.fillRect(1130, 520, 22, 200)
    ctx.fillRect(1130, 520 + 0, 22, 200)
    ctx.fillRect(1130, 530, 22, 190)
    ctx.fillRect(1218, 530, 22, 190)
    ctx.fillRect(1130, 560, 110, 14)
    const bx = 1560
    const by = 760
    ctx.fillStyle = '#9a6b45'
    ctx.beginPath()
    ctx.ellipse(bx, by, 150, 40, 0, 0, Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(bx - 150, by)
    ctx.bezierCurveTo(bx - 140, by + 120, bx + 140, by + 120, bx + 150, by)
    ctx.fill()
    ctx.fillStyle = '#7a5235'
    ctx.beginPath()
    ctx.ellipse(bx, by, 150, 40, 0, 0, Math.PI * 2)
    ctx.fill()
    SHEEP_T.forEach((s, i) => {
      const startX = 200 + i * 150
      const wait = startX
      const prog = smooth(p(t, s - 0.8, s + 1.4))
      let x: number, y: number, sc: number
      if (prog < 0.6) {
        const q = prog / 0.6
        x = lerp(wait, 1185, q)
        y = lerp(640, 660, q)
        sc = 0.9
      } else {
        const q = (prog - 0.6) / 0.4
        x = lerp(1185, 1380, q)
        y = lerp(660, 560, q)
        sc = lerp(0.9, 0.5, q)
      }
      const fade = 1 - smooth(p(t, s + 1.1, s + 1.6))
      ctx.save()
      ctx.globalAlpha *= fade
      sheep(x, y, sc * 1.35, t * 9 + i)
      ctx.restore()
      const d = s + 0.9
      const k = p(t, d - 0.5, d)
      if (t > d - 0.5) {
        const tx = bx - 70 + i * 35
        const ty = by - 18 - (i % 2) * 10
        const fx = lerp(1290, tx, k)
        const fy = lerp(380, ty, k) - Math.sin(k * Math.PI) * 120
        pebble(fx, fy, 22, [C.terra, C.ochre, C.sage, C.sky, C.plum][i], 1, 40 + i)
      }
    })
    caption('Long ago, a shepherd had no numbers.', a0 + 0.4, 7.9, 180)
    caption('For every sheep, one pebble.', 8.0, a1 - 0.2, 180)
    ctx.restore()
  }

  function bonePath(x: number, y: number, w: number, h: number) {
    const r = h * 0.55
    ctx.beginPath()
    ctx.moveTo(x + r, y + h * 0.25)
    ctx.lineTo(x + w - r, y + h * 0.25)
    ctx.arc(x + w - r * 0.6, y + h * 0.12, r * 0.7, Math.PI * 0.9, Math.PI * 2.25)
    ctx.arc(x + w - r * 0.6, y + h * 0.88, r * 0.7, Math.PI * 1.75, Math.PI * 3.1)
    ctx.lineTo(x + r, y + h * 0.75)
    ctx.arc(x + r * 0.6, y + h * 0.88, r * 0.7, Math.PI * -0.1, Math.PI * 1.25)
    ctx.arc(x + r * 0.6, y + h * 0.12, r * 0.7, Math.PI * 0.75, Math.PI * 2.1)
    ctx.closePath()
  }
  function sceneBone() {
    const [a0, a1] = T.bone
    const a = win(t, a0, a1)
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    bg()
    const bx = 360
    const by = 380
    const bw = 1200
    const bh = 220
    const rise = outCubic(p(t, a0, a0 + 1))
    ctx.save()
    ctx.translate(0, (1 - rise) * 40)
    ctx.fillStyle = 'rgba(60,40,20,0.15)'
    ctx.save()
    ctx.translate(10, 18)
    bonePath(bx, by, bw, bh)
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = C.bone
    bonePath(bx, by, bw, bh)
    ctx.fill()
    ctx.strokeStyle = '#c9b893'
    ctx.lineWidth = 4
    bonePath(bx, by, bw, bh)
    ctx.stroke()
    ctx.strokeStyle = C.ink
    ctx.lineCap = 'round'
    ctx.lineWidth = 11
    const xs = [620, 690, 760, 830, null, 1060, 1130, 1200]
    NOTCH_T.forEach((s, i) => {
      const k = smooth(p(t, s, s + 0.35))
      if (k <= 0) return
      if (i === 4) {
        ctx.beginPath()
        ctx.moveTo(580, 470)
        ctx.lineTo(lerp(580, 870, k), lerp(470, 580, k) * 1)
        ctx.stroke()
        return
      }
      const x = xs[i] as number
      ctx.beginPath()
      ctx.moveTo(x, 455)
      ctx.lineTo(x, lerp(455, 600, k))
      ctx.stroke()
    })
    ctx.restore()
    caption('People carved a mark for each thing they counted.', a0 + 0.4, 20.7, 180)
    caption('Every fifth mark crossed the others, to make counting faster.', 20.6, a1 - 0.2, 180)
    NOTCH_T.forEach((s, i) => pebble(560 + i * 110, 780, 22, i < 5 ? C.terra : C.sage, smooth(p(t, s, s + 0.3)), 70 + i))
    ctx.restore()
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
  function card(x: number, y: number, w: number, h: number, label: string, place: string, drawGlyph: () => void, k: number) {
    if (k <= 0) return
    const s = lerp(0.85, 1, outBack(k))
    ctx.save()
    ctx.globalAlpha *= smooth(k * 1.6)
    ctx.translate(x + w / 2, y + h / 2)
    ctx.scale(s, s)
    ctx.translate(-w / 2, -h / 2)
    ctx.fillStyle = 'rgba(60,40,20,0.14)'
    roundRect(8, 12, w, h, 28)
    ctx.fill()
    ctx.fillStyle = '#fbf6ea'
    roundRect(0, 0, w, h, 28)
    ctx.fill()
    ctx.strokeStyle = '#d8c8a6'
    ctx.lineWidth = 3
    roundRect(0, 0, w, h, 28)
    ctx.stroke()
    ctx.save()
    ctx.translate(w / 2, h * 0.42)
    drawGlyph()
    ctx.restore()
    text(label, w / 2, h * 0.78, { size: 40, weight: 700 })
    text(place, w / 2, h * 0.88, { size: 28, weight: 500, color: C.soft })
    ctx.restore()
  }
  function wedge(x: number, y: number, s: number) {
    ctx.beginPath()
    ctx.moveTo(x - 24 * s, y - 34 * s)
    ctx.lineTo(x + 24 * s, y - 34 * s)
    ctx.lineTo(x, y - 4 * s)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(x - 4 * s, y - 14 * s, 8 * s, 46 * s)
  }
  function sceneFive() {
    const [a0, a1] = T.five
    const a = win(t, a0, a1)
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    bg()
    text('Five', W / 2, 150, { size: 96, font: SERIF, weight: 700, alpha: smooth(p(t, a0 + 0.2, a0 + 1)) })
    for (let i = 0; i < 5; i++) pebble(W / 2 - 140 + i * 70, 250, 20, C.terra, smooth(p(t, a0 + 0.5 + i * 0.12, a0 + 0.8 + i * 0.12)), 90 + i)
    const cw = 300
    const ch = 420
    const gap = 36
    const x0 = (W - (cw * 5 + gap * 4)) / 2
    const y0 = 340
    const glyphs = [
      () => {
        ctx.fillStyle = C.ink
        ;[
          [-50, -40],
          [0, -40],
          [50, -40],
          [-25, 40],
          [25, 40],
        ].forEach(([x, y]) => {
          roundRect(x - 9, y - 34, 18, 68, 9)
          ctx.fill()
        })
      },
      () => {
        ctx.fillStyle = C.ink
        ;[
          [-50, -30],
          [0, -30],
          [50, -30],
          [-25, 50],
          [25, 50],
        ].forEach(([x, y]) => wedge(x, y, 0.9))
      },
      () => {
        ctx.fillStyle = C.ink
        roundRect(-90, -16, 180, 32, 16)
        ctx.fill()
      },
      () => {
        text('V', 0, 6, { size: 170, font: SERIF, weight: 700 })
      },
      () => {
        text('5', 0, 6, { size: 190, font: SANS, weight: 800, color: C.terra })
      },
    ]
    const labels = [
      ['Egypt', 'strokes'],
      ['Babylon', 'wedges'],
      ['Maya', 'a bar'],
      ['Rome', 'V'],
      ['India → today', '5'],
    ]
    CARD_T.forEach((s, i) => card(x0 + i * (cw + gap), y0, cw, ch, labels[i][0], labels[i][1], glyphs[i], p(t, s, s + 0.6)))
    caption('People everywhere wrote "five" in their own way.', a0 + 1.2, a1 - 0.2, 880)
    ctx.restore()
  }

  function sceneZero() {
    const [a0, a1] = T.zero
    const a = win(t, a0, a1)
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    bg()
    const cx = W / 2
    const cy = 500
    const draw0 = (x: number, y: number, ry: number, lw: number, frac = 1) => {
      ctx.strokeStyle = C.terra
      ctx.lineWidth = lw
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.ellipse(x, y, ry * 0.72, ry, 0, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2)
      ctx.stroke()
    }
    const k = smooth(p(t, 38.6, 40.0))
    const m = smooth(p(t, 40.8, 41.8))
    const s2 = smooth(p(t, 43.4, 44.0))
    const sh = s2 * 90
    if (k > 0) draw0(lerp(cx, cx + 90, m) - sh, lerp(470, cy, m), lerp(160, 98, m), lerp(28, 22, m), k)
    text('1', cx - 90 - sh, cy + 8, { size: 280, font: SANS, weight: 800, alpha: m })
    if (s2 > 0) {
      ctx.save()
      ctx.globalAlpha *= s2
      draw0(cx + 180, cy, 98 * lerp(0.6, 1, outBack(s2)), 22)
      ctx.restore()
    }
    text('ten', cx, 730, { size: 64, weight: 700, color: C.soft, alpha: smooth(p(t, 41.8, 42.4)) * (1 - smooth(p(t, 43.0, 43.4))) })
    text('one hundred', cx, 730, { size: 64, weight: 700, color: C.soft, alpha: smooth(p(t, 44.0, 44.6)) })
    caption('In India, people made a sign for nothing at all: zero.', a0 + 0.6, 41.6, 180)
    caption('Zero holds a place, so a few digits can make big numbers.', 41.7, a1 - 0.2, 180)
    ctx.restore()
  }

  function sceneToday() {
    const [a0, a1] = T.today
    const a = smooth(p(t, a0, a0 + 0.6)) * (1 - smooth(p(t, a1 - 1.2, a1)))
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    bg()
    const cols = [C.terra, C.ochre, C.sage, C.sky, C.plum]
    for (let i = 0; i < 10; i++) {
      const s = DIGIT_T[i]
      const k = outBack(p(t, s, s + 0.55))
      const x = W / 2 - 4.5 * 150 + i * 150
      const y = 480 + (1 - k) * -80
      text(String(i), x, y, { size: 170, font: SANS, weight: 800, color: cols[i % 5], alpha: smooth(p(t, s, s + 0.25)) })
    }
    caption('Ten digits, shared by the whole world.', 49.0, a1, 760)
    text('The Story of Numbers', W / 2, 900, { size: 44, font: SERIF, weight: 700, color: C.soft, alpha: smooth(p(t, 50.5, 51.5)) })
    ctx.restore()
  }

  ctx.globalAlpha = 1
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  bg()
  sceneTitle()
  sceneSheep()
  sceneBone()
  sceneFive()
  sceneZero()
  sceneToday()
}

function Scene({ t }: { t: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (ctx) draw(ctx, t)
  }, [t])
  return <canvas ref={canvas} width={W} height={H} style={{ width: '100%', height: '100%', display: 'block' }} />
}

export const ep0: SceneDef = {
  id: 'ep0',
  number: 0,
  title: 'The Story of Numbers',
  duration: DURATION,
  events: EVENTS,
  beats: [],
  render: 'canvas',
  Scene,
}
