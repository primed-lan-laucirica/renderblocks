import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GameProps } from '@renderblocks/kernel'
import { Plane, RANGE, sx, sy, type Pt } from './Plane'
import { playEffect } from './sounds'
import { useDarkMode } from './useDarkMode'

type Mode = 'tap' | 'draw' | 'find'

const STORAGE_KEY = 'progress'
const fmt = (p: Pt) => `(${p.x}, ${p.y})`

function randomTarget(prev?: Pt): Pt {
  for (;;) {
    const x = Math.floor(Math.random() * (RANGE * 2 + 1)) - RANGE
    const y = Math.floor(Math.random() * (RANGE * 2 + 1)) - RANGE
    if (x === 0 && y === 0) continue
    if (prev && x === prev.x && y === prev.y) continue
    return { x, y }
  }
}

/** One signed axis stepper: −  value  + */
function Stepper({
  label,
  value,
  onChange,
  dark,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  dark: boolean
}) {
  const btn = `w-14 h-14 rounded-2xl text-3xl font-extrabold border-4 ${
    dark
      ? 'bg-slate-800 text-teal-300 border-teal-700 active:bg-slate-700'
      : 'bg-white text-teal-700 border-teal-300 active:bg-teal-50'
  }`
  return (
    <div className="flex items-center gap-2">
      <span className={`w-6 text-2xl font-extrabold italic ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
        {label}
      </span>
      <button
        type="button"
        onPointerDown={() => onChange(Math.max(-RANGE, value - 1))}
        style={{ touchAction: 'manipulation' }}
        className={btn}
      >
        −
      </button>
      <span
        className={`w-16 text-center text-4xl font-extrabold tabular-nums ${
          dark ? 'text-slate-100' : 'text-slate-700'
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        onPointerDown={() => onChange(Math.min(RANGE, value + 1))}
        style={{ touchAction: 'manipulation' }}
        className={btn}
      >
        +
      </button>
    </div>
  )
}

function App({ services }: GameProps) {
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  const [mode, setMode] = useState<Mode>('tap')
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [tapped, setTapped] = useState<Pt | null>(null)
  const [drawn, setDrawn] = useState<Pt[]>([])
  const [target, setTarget] = useState<Pt>(() => randomTarget())
  const [wrong, setWrong] = useState<Pt | null>(null)
  const [hit, setHit] = useState(false)
  const [found, setFound] = useState<number>(() => {
    try {
      const raw = services.storage.get(STORAGE_KEY)
      const n = raw ? (JSON.parse(raw) as { found?: number }).found : 0
      return typeof n === 'number' && n >= 0 ? n : 0
    } catch {
      return 0
    }
  })

  useEffect(() => {
    services.storage.set(STORAGE_KEY, JSON.stringify({ version: 1, found }))
  }, [services, found])

  useEffect(() => {
    if (wrong === null) return
    const t = window.setTimeout(() => setWrong(null), 2000)
    return () => window.clearTimeout(t)
  }, [wrong])

  const preview: Pt = { x, y }

  const plotFind = () => {
    if (hit) return
    if (x === target.x && y === target.y) {
      playEffect('yes')
      setHit(true)
      setFound((f) => f + 1)
      window.setTimeout(() => {
        if (found > 0 && (found + 1) % 5 === 0) playEffect('cheer', 0.7)
        setHit(false)
        setTarget(randomTarget(target))
        setX(0)
        setY(0)
      }, 1800)
    } else {
      playEffect('no', 0.55)
      setWrong({ x, y })
    }
  }

  const tabs: Array<{ id: Mode; label: string; icon: string }> = [
    { id: 'tap', label: 'Tap', icon: '👆' },
    { id: 'draw', label: 'Draw', icon: '✏️' },
    { id: 'find', label: 'Find', icon: '🎯' },
  ]

  const dashedGuides = (p: Pt, color: string) => (
    <g stroke={color} strokeWidth="2" strokeDasharray="5 4">
      <line x1={sx(p.x)} y1={sy(0)} x2={sx(p.x)} y2={sy(p.y)} />
      <line x1={sx(0)} y1={sy(p.y)} x2={sx(p.x)} y2={sy(p.y)} />
    </g>
  )

  return (
    <div
      className={`min-h-dvh flex flex-col items-center p-4 gap-3 select-none ${
        isDark
          ? 'bg-linear-to-b from-slate-800 via-slate-900 to-slate-950'
          : 'bg-linear-to-b from-teal-50 via-cloud to-cloud-lavender'
      }`}
    >
      {/* mode tabs + dark toggle */}
      <div className="w-full max-w-md flex items-center justify-between gap-2">
        <div className={`flex rounded-2xl p-1 ${isDark ? 'bg-slate-800' : 'bg-white shadow-playful'}`}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onPointerDown={() => {
                setMode(t.id)
                setWrong(null)
                setTapped(null)
              }}
              style={{ touchAction: 'manipulation' }}
              className={`px-4 py-2 rounded-xl text-lg font-extrabold ${
                mode === t.id
                  ? 'bg-teal-500 text-white'
                  : isDark
                    ? 'text-slate-400'
                    : 'text-slate-500'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'find' && (
            <span className={`text-lg font-extrabold ${isDark ? 'text-amber-300' : 'text-amber-500'}`}>
              ⭐ {found}
            </span>
          )}
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${
              isDark ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'
            }`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* headline readout */}
      <div className="h-14 flex items-center">
        {mode === 'tap' && (
          <div className={`text-4xl font-extrabold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
            {tapped ? fmt(tapped) : 'Tap a point'}
          </div>
        )}
        {mode === 'draw' && (
          <div className={`text-4xl font-extrabold tabular-nums ${isDark ? 'text-teal-300' : 'text-teal-600'}`}>
            {fmt(preview)}
          </div>
        )}
        {mode === 'find' && (
          <div className={`text-4xl font-extrabold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
            Find <span className={isDark ? 'text-amber-300' : 'text-amber-500'}>{fmt(target)}</span>
          </div>
        )}
      </div>

      <Plane dark={isDark} onTap={mode === 'tap' ? setTapped : undefined}>
        {/* draw mode: stamped points + connecting segments + live preview */}
        {mode === 'draw' && (
          <>
            {drawn.length > 1 && (
              <polyline
                points={drawn.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
                fill="none"
                stroke="#14b8a6"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            )}
            {drawn.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="7" fill="#0d9488" />
            ))}
            {dashedGuides(preview, '#f59e0b')}
            <circle
              cx={sx(preview.x)}
              cy={sy(preview.y)}
              r="9"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
            />
          </>
        )}

        {/* tap mode: the tapped point with guides */}
        {mode === 'tap' && tapped && (
          <>
            {dashedGuides(tapped, '#14b8a6')}
            <circle cx={sx(tapped.x)} cy={sy(tapped.y)} r="9" fill="#0d9488" />
          </>
        )}

        {/* find mode: preview crosshair, wrong attempts, revealed star */}
        {mode === 'find' && (
          <>
            {wrong && (
              <g opacity="0.8">
                <circle cx={sx(wrong.x)} cy={sy(wrong.y)} r="8" fill="#94a3b8" />
                <text
                  x={sx(wrong.x)}
                  y={sy(wrong.y) - 14}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="800"
                  fill="#94a3b8"
                >
                  {fmt(wrong)}
                </text>
              </g>
            )}
            {!hit && dashedGuides(preview, '#14b8a6')}
            {!hit && (
              <circle
                cx={sx(preview.x)}
                cy={sy(preview.y)}
                r="9"
                fill="none"
                stroke="#14b8a6"
                strokeWidth="3"
              />
            )}
            {hit && (
              <text
                x={sx(target.x)}
                y={sy(target.y) + 10}
                textAnchor="middle"
                fontSize="30"
              >
                ⭐
              </text>
            )}
          </>
        )}
      </Plane>

      {/* controls */}
      {mode !== 'tap' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Stepper label="x" value={x} onChange={setX} dark={isDark} />
            <Stepper label="y" value={y} onChange={setY} dark={isDark} />
          </div>
          <div className="flex items-center gap-3 mt-1">
            {mode === 'draw' && (
              <>
                <motion.button
                  type="button"
                  onPointerDown={() => setDrawn((d) => [...d, preview])}
                  style={{ touchAction: 'manipulation' }}
                  whileTap={{ scale: 0.93 }}
                  className="px-8 py-3 rounded-2xl bg-teal-500 text-white text-2xl font-extrabold shadow-playful"
                >
                  Plot {fmt(preview)}
                </motion.button>
                <button
                  type="button"
                  onPointerDown={() => setDrawn((d) => d.slice(0, -1))}
                  className={`px-4 py-3 rounded-2xl font-extrabold ${
                    isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  Undo
                </button>
                <button
                  type="button"
                  onPointerDown={() => setDrawn([])}
                  className={`px-4 py-3 rounded-2xl font-extrabold ${
                    isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  Clear
                </button>
              </>
            )}
            {mode === 'find' && (
              <motion.button
                type="button"
                onPointerDown={plotFind}
                style={{ touchAction: 'manipulation' }}
                whileTap={{ scale: 0.93 }}
                className="px-10 py-3 rounded-2xl bg-teal-500 text-white text-2xl font-extrabold shadow-playful"
              >
                Plot {fmt(preview)}
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* find-mode hit flash */}
      <AnimatePresence>
        {hit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-3xl font-extrabold rounded-3xl px-8 py-4 shadow-playful"
          >
            ⭐ {fmt(target)}!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
