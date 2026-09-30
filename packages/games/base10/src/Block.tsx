import { colourOf, groupOf, power, shapeOf } from './model'

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)))
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

/**
 * A base-ten block (spec: block look), drawn like the mat's: a cube, a
 * ten-rod or a flat, repeating in every group of three. Blocks from the
 * thousands up show a grid face (a thousand is ten hundreds, a million is
 * a thousand thousands) and carry their power, so none is ever drawn as a
 * pile of unit cubes.
 */
export function Block({ place, size }: { place: number; size: number }) {
  const shape = shapeOf(place)
  const base = colourOf(place)
  const top = shade(base, 1.18)
  const side = shade(base, 0.72)
  const line = shade(base, 0.55)
  const big = groupOf(place) > 0
  const label = big ? (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontWeight={900} fill="white" stroke={line} strokeWidth={0.6} paintOrder="stroke" fontSize={shape === 'rod' ? 7 : 16}>
      {power(place)}
    </text>
  ) : null

  if (shape === 'rod') {
    // Ten cubes in a row, with a top face.
    const w = size
    const h = size * 0.16
    return (
      <svg width={w} height={h} viewBox="0 0 104 16" aria-hidden className="shrink-0">
        <polygon points="0,4 4,0 104,0 100,4" fill={top} stroke={line} strokeWidth={0.5} />
        <polygon points="100,4 104,0 104,12 100,16" fill={side} stroke={line} strokeWidth={0.5} />
        <rect x={0} y={4} width={100} height={12} fill={base} stroke={line} strokeWidth={0.6} />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={(i + 1) * 10} y1={4} x2={(i + 1) * 10} y2={16} stroke={line} strokeWidth={0.5} />
        ))}
        {big && (
          <text x={50} y={10.5} textAnchor="middle" dominantBaseline="central" fontWeight={900} fill="white" stroke={line} strokeWidth={0.5} paintOrder="stroke" fontSize={8}>
            {power(place)}
          </text>
        )}
      </svg>
    )
  }

  if (shape === 'flat') {
    // A 10 × 10 slab, with a little thickness.
    return (
      <svg width={size} height={size} viewBox="0 0 104 104" aria-hidden className="shrink-0">
        <polygon points="100,4 104,0 104,100 100,104" fill={side} stroke={line} strokeWidth={0.6} />
        <polygon points="0,4 4,0 104,0 100,4" fill={top} stroke={line} strokeWidth={0.6} />
        <rect x={0} y={4} width={100} height={100} fill={base} stroke={line} strokeWidth={0.8} />
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i}>
            <line x1={(i + 1) * 10} y1={4} x2={(i + 1) * 10} y2={104} stroke={line} strokeWidth={0.5} />
            <line x1={0} y1={4 + (i + 1) * 10} x2={100} y2={4 + (i + 1) * 10} stroke={line} strokeWidth={0.5} />
          </g>
        ))}
        {label}
      </svg>
    )
  }

  // Cube: front, top and right faces. Big cubes get a 10 × 10 grid on each face.
  const f = 70 // front face side
  const d = 26 // depth offset
  const grid = (x0: number, y0: number, ux: number, uy: number, vx: number, vy: number) =>
    Array.from({ length: 9 }, (_, i) => {
      const t = (i + 1) / 10
      return (
        <g key={i}>
          <line x1={x0 + ux * t} y1={y0 + uy * t} x2={x0 + ux * t + vx} y2={y0 + uy * t + vy} stroke={line} strokeWidth={0.5} />
          <line x1={x0 + vx * t} y1={y0 + vy * t} x2={x0 + vx * t + ux} y2={y0 + vy * t + uy} stroke={line} strokeWidth={0.5} />
        </g>
      )
    })
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="shrink-0">
      <polygon points={`2,${2 + d} ${2 + d},2 ${2 + d + f},2 ${2 + f},${2 + d}`} fill={top} stroke={line} strokeWidth={1} />
      <polygon points={`${2 + f},${2 + d} ${2 + d + f},2 ${2 + d + f},${2 + f} ${2 + f},${2 + d + f}`} fill={side} stroke={line} strokeWidth={1} />
      <rect x={2} y={2 + d} width={f} height={f} fill={base} stroke={line} strokeWidth={1.2} />
      {big && (
        <>
          {grid(2, 2 + d, f, 0, 0, f)}
          {grid(2, 2 + d, f, 0, d, -d)}
          {grid(2 + f, 2 + d, d, -d, 0, f)}
          <text x={2 + f / 2} y={2 + d + f / 2} textAnchor="middle" dominantBaseline="central" fontWeight={900} fill="white" stroke={line} strokeWidth={0.8} paintOrder="stroke" fontSize={18}>
            {power(place)}
          </text>
        </>
      )}
    </svg>
  )
}
