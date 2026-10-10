/**
 * The Stamp Game's other pieces: the balance for missing-number puzzles,
 * the numeral-card composer for writing an answer, and the live notation
 * that follows the tiles in Explore.
 */
import { Balance, NumeralCard, StampTile } from '../kit/kit'
import { PanTiles } from '../kit/part3'
import { PLACE_COLOUR, SANS } from '../kit/sizes'
import { NONE, TILE_PLACES, TILE_VALUE, tilesValue, type Tiles } from './stampLayout'

const fmt = (n: number) => n.toLocaleString('en-US')

/**
 * The balance: `given` tiles and the child's own (`mine`, tappable to take
 * back) in the left pan, `right` in the other. While `held`, the beam is
 * held level (it swings free when the child checks).
 */
export function BalancePuzzle({ given, mine, right, unit, held, onTakeBack }: { given: number; mine: number; right: number; unit: 1 | 10; held: boolean; onTakeBack: (i: number) => void }) {
  const diff = right - (given + mine)
  const tilt = held ? 0 : Math.max(-12, Math.min(12, diff * 4))
  const rad = (tilt * Math.PI) / 180
  // Where the left pan's rim is (for the child's tiles' touch targets).
  const lx = 500 - Math.cos(rad) * 340
  const ly = 140 - Math.sin(rad) * 340 + 118
  const S = 0.6
  const size = 64 * S
  return (
    <svg viewBox="0 0 1000 560" className="w-full h-full touch-none select-none" preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={1000} height={560} rx={24} fill="#efe6d4" />
      <Balance
        x={500}
        y={140}
        tilt={tilt}
        left={
          <>
            <PanTiles n={given} value={unit} s={S} />
            <PanTiles n={mine} value={unit} s={S} from={given} />
          </>
        }
        right={<PanTiles n={right} value={unit} s={S} />}
      />
      {/* Generous targets over the child's own tiles: a tap takes one back. */}
      {Array.from({ length: mine }, (_, i) => {
        const j = given + i
        const x = lx + ((j % 5) - 2) * (size + 4) - size / 2
        const y = ly - size - 4 - Math.floor(j / 5) * (size + 4)
        return <rect key={i} x={x - 4} y={y - 4} width={size + 8} height={size + 8} fill="transparent" onPointerDown={() => onTakeBack(i)} />
      })}
      <text x={500} y={545} fontFamily={SANS} fontWeight={700} fontSize={26} fill="#7a6a58" textAnchor="middle">
        {held ? 'held level until you check' : diff === 0 ? 'level' : ''}
      </text>
    </svg>
  )
}

/** One tile button: tap to put another in the pan (or on the mat). */
export function TileButton({ value, label, onClick }: { value: 1 | 10 | 100; label: string; onClick: () => void }) {
  const place = String(value).length - 1
  return (
    <button type="button" onClick={onClick} className="rounded-xl bg-slate-800 border-2 border-slate-600 active:bg-slate-700 flex flex-col items-center p-1.5 min-w-20" aria-label={label}>
      <svg viewBox="-2 -2 70 70" className="h-12 w-12">
        <StampTile value={value} x={0} y={0} />
      </svg>
      <span className="text-sm font-bold" style={{ color: PLACE_COLOUR[place] }}>
        {label}
      </span>
    </button>
  )
}

/** The tray: one tap, one tile onto its column. */
export function TileTray({ tiles, onChange }: { tiles: Tiles; onChange: (c: Tiles) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {[2, 1, 0].map((p) => (
        <TileButton
          key={p}
          value={TILE_VALUE[p]}
          label={`+ ${TILE_PLACES[p]}`}
          onClick={() => {
            const c = [...tiles] as Tiles
            c[p] += 1
            onChange(c)
          }}
        />
      ))}
    </div>
  )
}

/** The notation, following the tiles: nested cards when every place holds 0–9, otherwise the sum by place. */
export function TileNotation({ tiles }: { tiles: Tiles }) {
  const v = tilesValue(tiles)
  const tidy = tiles.every((c) => c <= 9)
  const terms = [2, 1, 0].filter((p) => tiles[p] > 0).map((p) => tiles[p] * 10 ** p)
  return (
    <div className="flex flex-col items-center gap-2">
      {tidy ? (
        <svg viewBox="-20 -10 340 130" className="w-56 max-w-full">
          {[2, 1, 0]
            .filter((p) => tiles[p] > 0)
            .map((p) => (
              <NumeralCard key={p} value={tiles[p] * 10 ** p} right={310} y={0} />
            ))}
          {v === 0 && <NumeralCard value={0} right={310} y={0} />}
        </svg>
      ) : (
        <div className="text-2xl font-black text-slate-200 text-center">
          {terms.map((n) => fmt(n)).join(' + ')} = {fmt(v)}
        </div>
      )}
      <div className="text-5xl font-black text-white tabular-nums">{fmt(v)}</div>
    </div>
  )
}

/** Card racks: tap a card to nest it; tap the nest to clear it. */
export function CardComposer({ cards, onChange }: { cards: Tiles; onChange: (c: Tiles) => void }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <button type="button" onClick={() => onChange(NONE)} className="self-center" aria-label="Clear the cards">
        <svg viewBox="-20 -10 340 130" className="w-64 max-w-full">
          {[2, 1, 0]
            .filter((p) => cards[p] > 0)
            .map((p) => (
              <NumeralCard key={p} value={cards[p] * 10 ** p} right={310} y={0} />
            ))}
          {tilesValue(cards) === 0 && <rect x={-10} y={0} width={320} height={100} rx={8} fill="none" stroke="#64748b" strokeWidth={3} strokeDasharray="10 8" />}
        </svg>
      </button>
      {[2, 1, 0].map((p) => (
        <div key={p} className="flex flex-wrap gap-1 justify-center">
          {Array.from({ length: 9 }, (_, d) => d + 1).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                const c = [...cards] as Tiles
                c[p] = c[p] === d ? 0 : d
                onChange(c)
              }}
              className={`rounded-md px-1.5 py-1 text-base font-black tabular-nums border-2 min-w-9 ${cards[p] === d ? 'bg-amber-200 border-amber-400' : 'bg-[#fbf6ea] border-[#d8c8a6]'}`}
              style={{ color: PLACE_COLOUR[p], fontFamily: SANS }}
            >
              {d * 10 ** p}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
