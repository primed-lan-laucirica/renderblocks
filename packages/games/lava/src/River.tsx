import { LEVELS, type Level, type LevelId } from './levels'
import { blockShape } from './shapes'

interface RiverProps {
  played: Set<LevelId>
  onPick: (level: Level) => void
  onHome: () => void
}

/** What stands on each island: a still from its level. */
const PREVIEW: Record<LevelId, number[]> = {
  free: [2, 5, 9, 4],
  rising: [9, 7, 4],
  lineup: [3, 8, 15],
  balance: [7, 3, 4],
  hole: [1, 2, 3],
}

const UNIT = 11

/** A block drawn from the battle's own cube layout, standing on y = 0 (SVG, y down). */
function Mini({ value, x }: { value: number; x: number }) {
  const s = blockShape(value)
  return (
    <g transform={`translate(${x + (s.w * UNIT) / 2} ${-(s.h * UNIT) / 2})`}>
      {s.cubes.map((c, i) => (
        <rect
          key={i}
          x={(c.cx - c.w / 2) * UNIT + 0.5}
          y={-(c.cy + c.h / 2) * UNIT + 0.5}
          width={c.w * UNIT - 1}
          height={c.h * UNIT - 1}
          fill={c.fill}
          stroke={c.outline ?? 'none'}
          strokeWidth={1}
        />
      ))}
    </g>
  )
}

/** Blocks in a row on the island top, with the level's own touch. */
function Scene({ id }: { id: LevelId }) {
  const values = PREVIEW[id]
  const widths = values.map((v) => blockShape(v).w * UNIT)
  const gap = 8
  const total = widths.reduce((a, b) => a + b, 0) + gap * (values.length - 1)
  const xs = widths.map((_, i) => -total / 2 + widths.slice(0, i).reduce((a, b) => a + b + gap, 0))
  const blocks = values.map((v, i) => <Mini key={v} value={v} x={xs[i]} />)
  return (
    <g>
      {id === 'rising' && <rect x={-total / 2 - 10} y={-24} width={total + 20} height={24} fill="#ea580c" opacity={0.85} />}
      {id === 'lineup' && (
        <g fill="none" stroke="white" strokeDasharray="4 3" strokeWidth={1.5} opacity={0.8}>
          <rect x={total / 2 + 10} y={-UNIT * 2} width={UNIT} height={UNIT * 2} />
        </g>
      )}
      {id === 'hole' && (
        <g>
          <circle cx={total / 2 + 26} cy={-46} r={18} fill="#020617" stroke="#fb923c" strokeWidth={3} />
          <text x={total / 2 + 26} y={-41} textAnchor="middle" fontSize={14} fontWeight={800} fill="white">
            6
          </text>
        </g>
      )}
      {blocks}
      {id === 'rising' && <rect x={-total / 2 - 10} y={-24} width={total + 20} height={24} fill="#ea580c" opacity={0.55} />}
    </g>
  )
}

/**
 * The level selector: a lava river along the bottom, an island per level
 * floating over it. Every island is open; one played keeps an ember.
 */
export function River({ played, onPick, onHome }: RiverProps) {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-linear-to-b from-indigo-950 via-orange-950 to-orange-900 text-white select-none">
      <style>{`
        @keyframes lava-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes lava-flow { from { background-position: 0 0 } to { background-position: 400px 0 } }
      `}</style>
      <button
        type="button"
        onClick={onHome}
        className="absolute top-3 left-3 z-10 w-11 h-11 rounded-full bg-white/15 text-xl font-bold"
        aria-label="Home"
      >
        ←
      </button>

      {/* The river. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[22%]"
        style={{
          background: 'repeating-linear-gradient(90deg, #c2410c 0, #f97316 200px, #c2410c 400px)',
          animation: 'lava-flow 12s linear infinite',
          boxShadow: '0 -24px 60px rgba(251, 146, 60, 0.5)',
        }}
      />

      <div className="absolute inset-0 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex items-center gap-6 px-16 pb-[8%] w-max">
          {LEVELS.map((level, i) => (
            <button
              key={level.id}
              type="button"
              onClick={() => onPick(level)}
              aria-label={level.name}
              className="relative flex flex-col items-center gap-2 shrink-0 active:scale-95 transition-transform"
              style={{ animation: `lava-bob ${3 + (i % 3) * 0.4}s ease-in-out ${i * 0.3}s infinite` }}
            >
              <div className="px-4 py-1.5 rounded-xl bg-black/40 text-[clamp(1.25rem,2.6vw,2rem)] font-black tabular-nums whitespace-nowrap">{level.sign}</div>
              <svg
                viewBox="-120 -110 240 150"
                className="w-[min(300px,30vw)] min-w-[200px] h-auto"
                style={{ filter: played.has(level.id) ? 'none' : 'drop-shadow(0 0 10px rgba(253, 186, 116, 0.55))' }}
              >
                <Scene id={level.id} />
                {/* The island: a rock slab with a rough underside. */}
                <path d="M-110 0 H110 L96 14 L70 22 L40 36 L0 40 L-36 34 L-72 22 L-98 12 Z" fill="#57534e" />
                <rect x={-110} y={0} width={220} height={4} fill="#a8a29e" />
                {played.has(level.id) && <circle cx={92} cy={10} r={5} fill="#fb923c" stroke="#fed7aa" strokeWidth={1.5} />}
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
