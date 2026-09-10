import type { Cell, Fill, Glyph, ShapeKind } from './types'

/** Glyph geometry in a 0..100 box, centred on (50,50). */
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
      return (
        <polygon
          points="50,6 61,38 95,38 68,58 78,91 50,71 22,91 32,58 5,38 39,38"
          {...props}
        />
      )
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

/** Layout for n glyphs inside one cell: [x, y, scale] per glyph. */
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
      // 5–6: two rows of three
      const out: Array<[number, number, number]> = []
      for (let i = 0; i < n; i++) {
        const col = i % 3
        const row = Math.floor(i / 3)
        out.push([22 + col * 28, n <= 3 ? 50 : 32 + row * 36, 0.32])
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

/** One cell of a figural item. `blank` renders the "?" placeholder. */
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
  if (blank || !cell) {
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <text
          x={50}
          y={50}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={54}
          fontWeight={800}
          fill={dark ? '#64748b' : '#cbd5e1'}
        >
          ?
        </text>
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
