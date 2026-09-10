import { COLORS, type Cell, type Fill, type Glyph, type ShapeKind } from './types'

function shapeNode(shape: ShapeKind, props: Record<string, unknown>) {
  switch (shape) {
    case 'circle':
      return <circle cx={50} cy={50} r={38} {...props} />
    case 'square':
      return <rect x={13} y={13} width={74} height={74} rx={4} {...props} />
    case 'triangle':
      return <polygon points="50,10 90,84 10,84" {...props} />
    case 'diamond':
      return <polygon points="50,7 91,50 50,93 9,50" {...props} />
    case 'star':
      return <polygon points="50,6 61,38 95,38 68,58 78,91 50,71 22,91 32,58 5,38 39,38" {...props} />
    case 'hexagon':
      return <polygon points="50,8 87,29 87,71 50,92 13,71 13,29" {...props} />
    case 'pentagon':
      return <polygon points="50,8 91,38 76,86 24,86 9,38" {...props} />
    case 'cross':
      return (
        <polygon
          points="36,10 64,10 64,36 90,36 90,64 64,64 64,90 36,90 36,64 10,64 10,36 36,36"
          {...props}
        />
      )
    case 'arrow':
      return <polygon points="12,36 60,36 60,14 92,50 60,86 60,64 12,64" {...props} />
  }
}

function fillProps(color: string, fill: Fill) {
  switch (fill) {
    case 'solid':
      return { fill: color, stroke: color, strokeWidth: 3 }
    case 'light':
      return { fill: color, fillOpacity: 0.3, stroke: color, strokeWidth: 5 }
    case 'outline':
      return { fill: 'none', stroke: color, strokeWidth: 7 }
  }
}

function positions(n: number): Array<[number, number, number]> {
  switch (n) {
    case 1:
      return [[50, 50, 1]]
    case 2:
      return [
        [28, 50, 0.5],
        [72, 50, 0.5],
      ]
    case 3:
      return [
        [50, 26, 0.45],
        [27, 70, 0.45],
        [73, 70, 0.45],
      ]
    case 4:
      return [
        [28, 28, 0.45],
        [72, 28, 0.45],
        [28, 72, 0.45],
        [72, 72, 0.45],
      ]
    default: {
      const out: Array<[number, number, number]> = []
      for (let i = 0; i < n; i++) {
        const col = i % 3
        const row = Math.floor(i / 3)
        out.push([22 + col * 28, 32 + row * 36, 0.32])
      }
      return out
    }
  }
}

function GlyphNode({ g, at }: { g: Glyph; at: [number, number, number] }) {
  const [cx, cy, base] = at
  const s = base * g.size
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s}) rotate(${g.rotation}) translate(-50 -50)`}>
      {shapeNode(g.shape, fillProps(g.color, g.fill))}
    </g>
  )
}

/** Renders any cell variant into a square viewport. */
export function CellView({
  cell,
  blank = false,
  dark,
  className = '',
}: {
  cell?: Cell
  blank?: boolean
  dark: boolean
  className?: string
}) {
  const muted = dark ? '#64748b' : '#cbd5e1'
  const ink = dark ? '#e2e8f0' : '#334155'

  if (blank || !cell || (cell.kind === 'glyphs' && cell.glyphs.length === 0)) {
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <text x={50} y={50} textAnchor="middle" dominantBaseline="central" fontSize={54} fontWeight={800} fill={muted}>
          ?
        </text>
      </svg>
    )
  }

  if (cell.kind === 'number' || cell.kind === 'text') {
    const label = cell.kind === 'number' ? cell.value.toLocaleString('en-US') : cell.text
    const len = label.length
    const size = len <= 2 ? 46 : len <= 3 ? 36 : len <= 4 ? 28 : 22
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <text
          x={50}
          y={50}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size}
          fontWeight={800}
          fill={label === '?' ? muted : ink}
        >
          {label}
        </text>
      </svg>
    )
  }

  if (cell.kind === 'field') {
    const n = cell.grid.length
    const s = 100 / n
    return (
      <svg viewBox="0 0 100 100" className={className}>
        {cell.grid.map((row, r) =>
          row.map((v, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * s}
              y={r * s}
              width={s + 0.5}
              height={s + 0.5}
              fill={COLORS[v % COLORS.length]}
            />
          )),
        )}
        {cell.hole && (
          <rect
            x={cell.hole.c * s}
            y={cell.hole.r * s}
            width={cell.hole.n * s}
            height={cell.hole.n * s}
            fill={dark ? '#0f172a' : '#ffffff'}
            stroke={muted}
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        )}
      </svg>
    )
  }

  if (cell.kind === 'sheet' || cell.kind === 'fold') {
    const n = cell.size
    const s = 100 / n
    const holes = cell.kind === 'sheet' ? cell.holes : cell.punches
    // A folded sheet only shows half the page, with the fold line dashed.
    const foldAxis = cell.kind === 'fold' ? cell.axis : null
    const w = foldAxis === 'v' ? 50 : 100
    const h = foldAxis === 'h' ? 50 : 100
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <rect
          x={1}
          y={1}
          width={w - 2}
          height={h - 2}
          rx={4}
          fill={dark ? '#1e293b' : '#f8fafc'}
          stroke={ink}
          strokeWidth={2.5}
        />
        {foldAxis && (
          <line
            x1={foldAxis === 'v' ? w : 0}
            y1={foldAxis === 'v' ? 0 : h}
            x2={foldAxis === 'v' ? w : 100}
            y2={foldAxis === 'v' ? 100 : h}
            stroke={muted}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}
        {holes.map(([r, c], i) => (
          <circle
            key={i}
            cx={c * s + s / 2}
            cy={r * s + s / 2}
            r={s * 0.26}
            fill={dark ? '#0f172a' : '#ffffff'}
            stroke={ink}
            strokeWidth={2}
          />
        ))}
      </svg>
    )
  }

  const pos = positions(cell.glyphs.length)
  return (
    <svg viewBox="0 0 100 100" className={className}>
      {cell.glyphs.map((g, i) => (
        <GlyphNode key={i} g={g} at={pos[i] ?? pos[pos.length - 1]} />
      ))}
    </svg>
  )
}
