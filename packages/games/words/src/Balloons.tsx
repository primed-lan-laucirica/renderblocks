import { useCallback, useEffect, useRef, useState } from 'react'
import { playEffect, playWord, stopAll, unlockAudio } from './audio'
import { lookAlikes, shuffle } from './balloons'
import { nextSentence, useReader } from './reading'
import { SentenceText } from './Sentence'
import { PartLetters } from './WordParts'
import type { Sentence, Word } from './words'

/**
 * Balloons floating up over the hills.
 *   find — a voice says a word; pop the balloon that carries it, among
 *          look-alikes (fin fan pin fit). The right one says the word, then
 *          reads its sentence. A wrong one boings away saying its own word.
 *   pop  — free popping: every balloon says its word, then its sentence.
 * The balloons pause while a sentence is read, so it has his attention.
 */
export type BalloonMode = 'find' | 'pop'

/** Light enough that dark letters and red vowels read clearly on them. */
const COLOURS = ['#fde68a', '#bbf7d0', '#bae6fd', '#ddd6fe', '#fed7aa', '#a5f3fc', '#d9f99d', '#fef08a']
/** Seconds to rise from the hills to the top of the sky. */
const RISE_S = 9
/** Find: say the word again after this long without an answer. */
const REPEAT_S = 10

interface Balloon {
  id: number
  word: Word
  colour: string
  /** Centre x, and top of the balloon, px. */
  x: number
  y: number
  sway: number
  state: 'rise' | 'leave'
}

interface Reward {
  word: Word
  sentence: Sentence | null
}

let nextId = 1
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function Balloons({ words, mode }: { words: Word[]; mode: BalloonMode }) {
  const box = useRef<HTMLDivElement>(null)
  const burstLayer = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [reward, setReward] = useState<Reward | null>(null)
  const { spoken, read } = useReader()
  // Everything the frame loop reads lives in refs.
  const live = useRef<Balloon[]>([])
  const busy = useRef(false)
  const target = useRef<Word | null>(null)
  const queue = useRef<Word[]>([])
  const said = useRef(0)
  const spawnAt = useRef<Array<{ at: number; word: Word }>>([])
  const nextFree = useRef(0)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    const el = box.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => {
      alive.current = false
      ro.disconnect()
      stopAll()
    }
  }, [])

  // Balloon size: four across on a phone, capped on a tablet.
  const bw = Math.max(110, Math.min(size.w / 4.3, size.h / 3.4, 210))
  const bodyH = bw * 1.15
  const speed = (size.h + bw * 2) / RISE_S

  /** A lane clear of balloons still low on screen. */
  const laneX = useCallback(() => {
    const lanes = Math.max(3, Math.floor(size.w / (bw * 1.15)))
    const width = size.w / lanes
    const busyLanes = new Set(live.current.filter((b) => b.y > size.h * 0.35).map((b) => Math.floor(b.x / width)))
    const free = [...Array(lanes).keys()].filter((i) => !busyLanes.has(i))
    const pick = free.length ? free[Math.floor(Math.random() * free.length)] : Math.floor(Math.random() * lanes)
    return (pick + 0.5) * width
  }, [size.w, size.h, bw])

  const launch = useCallback(
    (word: Word) => {
      live.current.push({
        id: nextId++,
        word,
        colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
        x: laneX(),
        y: size.h + bw * 0.2,
        sway: Math.random() * Math.PI * 2,
        state: 'rise',
      })
    },
    [laneX, size.h, bw],
  )

  const say = useCallback((w: Word) => {
    said.current = performance.now()
    void playWord(w.word)
  }, [])

  /** Find: a new word, and it and three look-alikes rising one after another. */
  const newRound = useCallback(() => {
    if (!queue.current.length) queue.current = shuffle(words)
    const w = queue.current.pop()!
    target.current = w
    const others = lookAlikes(
      w.word,
      words.map((x) => x.word),
      3,
    ).map((o) => words.find((x) => x.word === o)!)
    const now = performance.now()
    spawnAt.current = shuffle([w, ...others]).map((word, i) => ({ at: now + 300 + i * 650, word }))
    window.setTimeout(() => alive.current && target.current === w && say(w), 250)
  }, [words, say])

  // The frame loop: rise, sway, respawn (find) or stream (pop).
  useEffect(() => {
    if (!size.w || !size.h) return
    if (mode === 'find' && !target.current) newRound()
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!busy.current) {
        for (const s of spawnAt.current.filter((s) => s.at <= now)) launch(s.word)
        spawnAt.current = spawnAt.current.filter((s) => s.at > now)
        if (mode === 'pop' && now >= nextFree.current && live.current.filter((b) => b.state === 'rise').length < 5) {
          const shown = new Set(live.current.map((b) => b.word.word))
          const choices = words.filter((w) => !shown.has(w.word))
          if (choices.length) launch(choices[Math.floor(Math.random() * choices.length)])
          nextFree.current = now + 1500 + Math.random() * 900
        }
      }
      // While a sentence is read, rising balloons hold still; ones floating off keep going.
      for (const b of live.current) {
        if (busy.current && b.state === 'rise') continue
        b.y -= speed * dt * (b.state === 'leave' ? 3 : 1)
        b.sway += dt * 1.1
      }
      if (!busy.current) {
        // Up and away: in find, the word's balloons come round again until it's found.
        const gone = live.current.filter((b) => b.y < -bodyH * 1.8)
        live.current = live.current.filter((b) => b.y >= -bodyH * 1.8)
        if (mode === 'find') {
          for (const b of gone) if (b.state === 'rise') spawnAt.current.push({ at: now + 400, word: b.word })
          if (target.current && now - said.current > REPEAT_S * 1000) say(target.current)
        }
      }
      setBalloons([...live.current])
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [size.w, size.h, mode, words, speed, bodyH, launch, newRound, say])

  /** Say the word, show it big, then read its sentence (if it has one). */
  const celebrate = async (w: Word) => {
    busy.current = true
    setReward({ word: w, sentence: null })
    await playWord(w.word)
    const s = nextSentence(w.word)
    if (s && alive.current) {
      setReward({ word: w, sentence: s })
      await sleep(250)
      await read(s)
    }
    await sleep(900)
    if (!alive.current) return
    setReward(null)
    busy.current = false
  }

  const pop = (b: Balloon) => {
    unlockAudio()
    if (busy.current || b.state !== 'rise') return
    if (mode === 'find' && target.current && b.word.word !== target.current.word) {
      // Not this one: it boings away, saying what it is.
      live.current = live.current.map((x) => (x === b ? { ...x, state: 'leave' } : x))
      playEffect('boing')
      window.setTimeout(() => alive.current && void playWord(b.word.word), 180)
      return
    }
    live.current = live.current.filter((x) => x !== b)
    if (burstLayer.current) burst(burstLayer.current, b, bw, bodyH)
    playEffect('pop')
    if (mode === 'find') {
      // Found: the rest float off, and the next word comes after the sentence.
      live.current = live.current.map((x) => ({ ...x, state: 'leave' }))
      spawnAt.current = []
      target.current = null
      void celebrate(b.word).then(() => alive.current && newRound())
    } else void celebrate(b.word)
  }

  return (
    <div ref={box} className="relative w-full h-full overflow-hidden select-none touch-none">
      {/* Sky and a few clouds. */}
      <div className="absolute inset-0 bg-linear-to-b from-sky-300 via-sky-100 to-sky-50" />
      <Cloud className="left-[8%] top-[10%] w-40" />
      <Cloud className="right-[12%] top-[22%] w-56" />
      <Cloud className="left-[42%] top-[6%] w-32" />

      {balloons.map((b) => (
        <button
          key={b.id}
          type="button"
          aria-label={`Balloon: ${b.word.word}`}
          onPointerDown={() => pop(b)}
          className="absolute"
          style={{
            width: bw,
            height: bodyH * 1.75,
            transform: `translate(${b.x - bw / 2 + Math.sin(b.sway) * bw * 0.07}px, ${b.y}px) rotate(${Math.sin(b.sway) * 3}deg)`,
            opacity: b.state === 'leave' ? 0.55 : 1,
          }}
        >
          <BalloonShape colour={b.colour} />
          <span
            className="absolute left-0 right-0 top-0 flex justify-center items-center font-black"
            style={{ height: bodyH * 1.1, fontSize: bw * (b.word.word.length > 4 ? 0.25 : 0.3) }}
          >
            {b.word.parts.map((p, i) => (
              <PartLetters key={i} part={p} />
            ))}
          </span>
        </button>
      ))}

      <div ref={burstLayer} className="absolute inset-0 pointer-events-none" />
      <Hills />

      {mode === 'find' && !reward && (
        <button
          type="button"
          onClick={() => target.current && say(target.current)}
          aria-label="Say the word again"
          className="absolute left-1/2 -translate-x-1/2 top-3 w-20 h-20 rounded-full bg-white/90 shadow-lg text-4xl"
        >
          🔊
        </button>
      )}

      {reward && (
        <div className="absolute inset-x-0 top-4 flex flex-col items-center gap-4 px-4 pointer-events-none">
          <div className="rounded-3xl bg-white/95 shadow-xl px-8 py-2 font-black text-[clamp(3rem,12vw,7rem)] leading-tight">
            {reward.word.parts.map((p, i) => (
              <PartLetters key={i} part={p} />
            ))}
          </div>
          {reward.sentence && (
            <div className="rounded-3xl bg-white/95 shadow-lg px-6 py-4 text-[clamp(1.5rem,4.5vw,2.6rem)] font-bold leading-snug text-slate-800 max-w-[min(92vw,48rem)]">
              <SentenceText s={reward.sentence} spoken={spoken} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** A short burst of the balloon's colour where it popped. */
function burst(layer: HTMLElement, b: Balloon, bw: number, bodyH: number): void {
  for (let i = 0; i < 12; i++) {
    const dot = document.createElement('div')
    const a = (i / 12) * Math.PI * 2
    const r = bw * (0.5 + Math.random() * 0.4)
    Object.assign(dot.style, {
      position: 'absolute',
      left: `${b.x - 7}px`,
      top: `${b.y + bodyH * 0.45 - 7}px`,
      width: '14px',
      height: '14px',
      borderRadius: '9999px',
      background: b.colour,
      border: '2px solid rgba(15,23,42,0.25)',
    })
    layer.appendChild(dot)
    dot
      .animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px) scale(0.4)`, opacity: 0 },
        ],
        { duration: 450, easing: 'cubic-bezier(.2,.7,.3,1)' },
      )
      .finished.then(() => dot.remove())
  }
}

function BalloonShape({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 100 175" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
      <path d="M50 118 C 44 135, 58 150, 48 175" stroke="#64748b" strokeWidth="1.6" fill="none" />
      <ellipse cx="50" cy="57" rx="47" ry="56" fill={colour} stroke="rgba(15,23,42,0.18)" strokeWidth="2" />
      <polygon points="44,113 56,113 50,120" fill={colour} stroke="rgba(15,23,42,0.18)" strokeWidth="1.5" />
      <ellipse cx="32" cy="30" rx="9" ry="15" fill="white" opacity="0.45" transform="rotate(-25 32 30)" />
    </svg>
  )
}

function Cloud({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 50" className={`absolute opacity-90 ${className}`} aria-hidden>
      <g fill="white">
        <ellipse cx="35" cy="32" rx="28" ry="16" />
        <ellipse cx="62" cy="24" rx="26" ry="20" />
        <ellipse cx="88" cy="32" rx="24" ry="15" />
      </g>
    </svg>
  )
}

/** Soft rolling hills in front: the balloons rise from behind them. */
function Hills() {
  return (
    <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-[22%] pointer-events-none" aria-hidden>
      <path d="M0 110 C 150 40, 300 60, 450 100 S 750 50, 1000 90 L1000 200 L0 200 Z" fill="#86efac" />
      <path d="M0 150 C 200 90, 380 120, 560 145 S 850 100, 1000 135 L1000 200 L0 200 Z" fill="#4ade80" />
      <path d="M0 185 C 250 150, 500 175, 700 180 S 900 160, 1000 175 L1000 200 L0 200 Z" fill="#22c55e" />
    </svg>
  )
}
