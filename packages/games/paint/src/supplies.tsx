/**
 * The controls, drawn by hand (rough.js, as Excalidraw draws): art supplies
 * standing in a tray, paint blobs on a palette, and doodled buttons. The
 * supply he's holding lifts out of the tray, its tip in the colour he picked.
 */
import { memo, useEffect, useMemo, useRef, type ReactNode } from 'react'
import rough from 'roughjs'
import { regular, rng, type Fill, type ShapeKind, type Tool } from './model'

const gen = rough.generator()
const INK = '#3B3030'

interface Part {
  d: string
  fill?: string
  /** Hatched by hand, rather than solid. */
  hatch?: boolean
  opacity?: number
}

/** Sketchy SVG paths for one part. */
function sketch(p: Part, seed: number, width: number) {
  const fill = p.fill && p.fill !== 'none' ? p.fill : undefined
  const d = gen.path(p.d, {
    stroke: INK,
    strokeWidth: width,
    roughness: 0.9,
    bowing: 0.6,
    seed,
    fill,
    fillStyle: p.hatch ? 'hachure' : 'solid',
    hachureGap: 3,
    fillWeight: 1,
  })
  return gen.toPaths(d)
}

export const Doodle = memo(function Doodle({ parts, box, width = 1.4, seed = 3, className, style }: { parts: Part[]; box: string; width?: number; seed?: number; className?: string; style?: React.CSSProperties }) {
  const paths = useMemo(() => parts.flatMap((p, i) => sketch(p, seed + i, width).map((q) => ({ ...q, opacity: p.opacity }))), [parts, seed, width])
  return (
    <svg viewBox={box} className={className} style={style} aria-hidden="true">
      {paths.map((p, i) => (
        <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? 'none'} opacity={p.opacity} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
})

/** Each supply standing up, tip at the top (viewBox 0 0 40 120); `c` is the colour he's painting with. */
function supplyParts(t: Tool | 'eraser' | 'hand' | 'bucket' | 'shape', c: string): Part[] {
  switch (t) {
    case 'pencil':
      return [
        { d: 'M12 26 L28 26 L28 104 L12 104 Z', fill: '#F6C343' },
        { d: 'M12 26 L20 4 L28 26 Z', fill: '#EBC79E' },
        { d: 'M17 12 L20 4 L23 12 Z', fill: c },
        { d: 'M12 104 L28 104 L28 111 L12 111 Z', fill: '#B8B8B8' },
        { d: 'M12 111 L28 111 L28 118 Q20 121 12 118 Z', fill: '#F48FB1' },
      ]
    case 'marker':
      return [
        { d: 'M11 40 L29 40 L29 112 Q20 118 11 112 Z', fill: '#F7F7F7' },
        { d: 'M11 72 L29 72 L29 82 L11 82 Z', fill: c },
        { d: 'M14 18 L26 18 L26 40 L14 40 Z', fill: '#E8E8E8' },
        { d: 'M16 18 Q20 4 24 18 Z', fill: c },
      ]
    case 'brush':
      return [
        { d: 'M15 58 L25 58 L23 116 Q20 120 17 116 Z', fill: '#C0392B' },
        { d: 'M13 40 L27 40 L25 58 L15 58 Z', fill: '#C9C9C9' },
        { d: 'M13 40 Q11 18 20 2 Q29 18 27 40 Z', fill: c },
      ]
    case 'crayon':
      return [
        { d: 'M12 26 L28 26 L28 114 L12 114 Z', fill: c },
        { d: 'M12 40 L28 40 L28 100 L12 100 Z', fill: '#FFF6DE' },
        { d: 'M12 26 L16 9 Q20 5 24 9 L28 26 Z', fill: c },
        { d: 'M14 60 L26 60 M14 80 L26 80' },
      ]
    case 'water':
      return [
        { d: 'M22 2 L26 2 L25 70 L23 70 Z', fill: '#E3B778' },
        { d: 'M9 66 Q20 61 31 66 L30 112 Q20 118 10 112 Z', fill: c, opacity: 0.55 },
        { d: 'M8 44 L32 44 L30 112 Q20 118 10 112 Z', fill: 'none' },
        { d: 'M6 42 L34 42 L34 48 L6 48 Z', fill: '#E6F2FA' },
      ]
    case 'spray':
      return [
        { d: 'M10 34 L30 34 L30 112 Q20 116 10 112 Z', fill: '#D8D8D8' },
        { d: 'M10 56 L30 56 L30 92 L10 92 Z', fill: c },
        { d: 'M10 34 Q10 24 20 24 Q30 24 30 34 Z', fill: c },
        { d: 'M16 13 L24 13 L24 24 L16 24 Z', fill: '#555555' },
        { d: 'M10 10 L11 11 M5 15 L6 16 M7 5 L8 6 M2 9 L3 10', fill: 'none' },
      ]
    case 'highlighter':
      return [
        { d: 'M10 46 L30 46 L30 112 Q20 116 10 112 Z', fill: c, opacity: 0.6 },
        { d: 'M10 30 L30 30 L30 46 L10 46 Z', fill: '#444444' },
        { d: 'M14 30 L15 12 L26 5 L26 30 Z', fill: c },
      ]
    case 'eraser':
      return [
        { d: 'M8 46 Q8 40 14 40 L26 40 Q32 40 32 46 L32 114 L8 114 Z', fill: '#F8BBD0' },
        { d: 'M8 70 L32 70 L32 114 L8 114 Z', fill: '#4FC3F7' },
      ]
    case 'hand':
      return [
        {
          d: 'M10 116 L9 66 Q9 59 13 59 Q17 59 17 66 L17 42 Q17 35 21 35 Q25 35 25 42 L25 48 Q25 42 29 42 Q33 42 33 48 L33 94 Q33 117 20 117 Z',
          fill: '#FFD9B8',
        },
        { d: 'M9 84 Q2 79 2 72 Q2 66 7 69 L9 73', fill: '#FFD9B8' },
      ]
    case 'bucket':
      return [
        { d: 'M8 52 Q20 14 32 52', fill: 'none' },
        { d: 'M8 52 L32 52 L29 112 Q20 117 11 112 Z', fill: '#A7A7A7' },
        { d: 'M8 52 Q20 46 32 52 Q20 58 8 52 Z', fill: c },
        { d: 'M11 53 Q13 66 11 74 Q9 66 11 53 Z', fill: c },
      ]
    case 'shape':
      return [
        { d: 'M20 22 L36 50 L4 50 Z', fill: 'none' },
        { d: 'M4 62 L24 62 L24 82 L4 82 Z', fill: 'none' },
        { d: 'M24 100 A10 10 0 1 0 24.1 100', fill: c, hatch: true },
      ]
  }
}

export type Holding = Tool | 'eraser' | 'hand' | 'bucket' | 'shape'

export const Supply = memo(function Supply({ tool, colour, held, label, onPick }: { tool: Holding; colour: string; held: boolean; label: string; onPick: () => void }) {
  const parts = useMemo(() => supplyParts(tool, colour), [tool, colour])
  return (
    <button type="button" onClick={onPick} aria-label={label} aria-pressed={held} className="shrink-0 w-[34px] sm:w-11 h-[104px] flex items-end justify-center">
      <Doodle
        parts={parts}
        box="0 0 40 120"
        seed={tool.length * 7}
        className="h-[96px] w-auto transition-transform duration-200 ease-out"
        style={{ transform: held ? 'translateY(-16px) rotate(-9deg)' : 'translateY(4px)', filter: held ? 'drop-shadow(0 6px 4px rgba(0,0,0,0.25))' : undefined }}
      />
    </button>
  )
})

/** A wobbly blob of paint (seeded, so each colour keeps its shape). */
function blobPath(seed: number, r = 15, cx = 20, cy = 20) {
  const rand = rng(seed)
  const n = 9
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const rr = r * (0.82 + rand() * 0.3)
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]
  })
  let d = `M${((pts[0][0] + pts[1][0]) / 2).toFixed(1)} ${((pts[0][1] + pts[1][1]) / 2).toFixed(1)}`
  for (let i = 1; i <= n; i++) {
    const a = pts[i % n]
    const b = pts[(i + 1) % n]
    d += ` Q${a[0].toFixed(1)} ${a[1].toFixed(1)} ${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`
  }
  return d + ' Z'
}

export const Blob = memo(function Blob({ colour, seed, picked, onPick, onPress }: { colour: string; seed: number; picked: boolean; onPick: () => void; onPress?: (e: React.PointerEvent) => void }) {
  const parts = useMemo<Part[]>(
    () => [
      ...(picked ? [{ d: 'M20 1 A19 19 0 1 0 20.1 1', fill: 'none' } as Part] : []),
      { d: blobPath(seed), fill: colour },
      { d: 'M13 13 Q15 10 18 11', fill: 'none', opacity: 0.6 },
    ],
    [colour, seed, picked],
  )
  return (
    <button
      type="button"
      onClick={onPick}
      onPointerDown={onPress}
      aria-label={`Paint colour ${colour}`}
      aria-pressed={picked}
      className="shrink-0 w-10 h-10 transition-transform touch-none"
      style={{ transform: picked ? 'scale(1.15)' : undefined }}
    >
      <Doodle parts={parts} box="0 0 40 40" seed={seed} width={picked ? 2 : 1.2} className="w-full h-full" />
    </button>
  )
})

/** One of three widths: a dot of paint that size. */
export const Width = memo(function Width({ i, colour, picked, onPick }: { i: number; colour: string; picked: boolean; onPick: () => void }) {
  const r = [4, 7.5, 12][i]
  const parts = useMemo<Part[]>(() => [...(picked ? [{ d: 'M20 3 A17 17 0 1 0 20.1 3', fill: 'none' } as Part] : []), { d: blobPath(40 + i, r), fill: colour }], [colour, picked, r, i])
  return (
    <button type="button" onClick={onPick} aria-label={['Thin', 'Medium', 'Thick'][i]} aria-pressed={picked} className="shrink-0 w-10 h-10">
      <Doodle parts={parts} box="0 0 40 40" seed={50 + i} className="w-full h-full" />
    </button>
  )
})

/** A doodled round button (home, undo, redo, keep, bin). */
export function Knob({ label, parts, onPress, disabled, children }: { label: string; parts: Part[]; onPress: () => void; disabled?: boolean; children?: ReactNode }) {
  const all = useMemo<Part[]>(() => [{ d: 'M20 2 A18 18 0 1 0 20.1 2', fill: '#FFFDF7' }, ...parts], [parts])
  return (
    <button type="button" onClick={onPress} disabled={disabled} aria-label={label} className="w-12 h-12 shrink-0 disabled:opacity-30 transition-opacity">
      <Doodle parts={all} box="0 0 40 40" seed={label.length} width={1.6} className="w-full h-full drop-shadow" />
      {children}
    </button>
  )
}

export const ICONS = {
  home: [{ d: 'M9 20 L20 9 L31 20 M12 18 L12 31 L28 31 L28 18 M17 31 L17 24 L23 24 L23 31' }],
  undo: [{ d: 'M29 27 Q30 13 18 13 L11 13 M15 8 L10 13 L15 18' }],
  redo: [{ d: 'M11 27 Q10 13 22 13 L29 13 M25 8 L30 13 L25 18' }],
  keep: [{ d: 'M10 12 L30 12 L30 29 L10 29 Z' }, { d: 'M12 27 L17 20 L21 24 L24 21 L28 27' }, { d: 'M25 15 A2 2 0 1 0 25.1 15', fill: '#FDD835' }],
  bin: [{ d: 'M11 13 L29 13 M17 13 L18 9 L22 9 L23 13 M13 13 L15 31 L25 31 L27 13 M18 17 L18 27 M22 17 L22 27' }],
  yes: [{ d: 'M11 21 L17 27 L29 13' }],
  no: [{ d: 'M13 13 L27 27 M27 13 L13 27' }],
  rinse: [{ d: 'M20 8 Q28 19 28 24 A8 8 0 1 1 12 24 Q12 19 20 8 Z', fill: '#B3E5FC' }, { d: 'M16 24 Q16 28 20 29', opacity: 0.6 }],
} satisfies Record<string, Part[]>

const polyD = (pts: [number, number][]) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z'

/** A shape to draw, as a little doodle. */
export const ShapeChip = memo(function ShapeChip({ kind, colour, picked, onPick }: { kind: ShapeKind; colour: string; picked: boolean; onPick: () => void }) {
  const d = {
    rect: 'M8 10 L32 10 L32 30 L8 30 Z',
    ellipse: 'M20 9 A12 11 0 1 0 20.1 9',
    triangle: 'M20 8 L33 31 L7 31 Z',
    pentagon: polyD(regular(5, -90, 8, 8, 32, 31)),
    hexagon: polyD(regular(6, 0, 7, 9, 33, 31)),
    octagon: polyD(regular(8, 22.5, 8, 8, 32, 32)),
    line: 'M8 31 L32 9',
    arrow: 'M8 31 L32 9 M22 10 L32 9 L31 19',
  }[kind]
  const parts = useMemo<Part[]>(() => [...(picked ? [{ d: 'M3 3 L37 3 L37 37 L3 37 Z', fill: '#FFF3C4' } as Part] : []), { d, fill: 'none' }], [d, picked])
  return (
    <button type="button" onClick={onPick} aria-label={kind} aria-pressed={picked} className="shrink-0 w-10 h-10" style={{ color: colour }}>
      <Doodle parts={parts} box="0 0 40 40" seed={kind.length} width={2} className="w-full h-full" />
    </button>
  )
})

/** How it's painted inside: none (for shapes), scribbled, solid or a wash. */
export const FillChip = memo(function FillChip({ fill, colour, picked, onPick }: { fill: Fill | 'none'; colour: string; picked: boolean; onPick: () => void }) {
  const parts = useMemo<Part[]>(() => {
    const sq = 'M9 9 L31 9 L31 31 L9 31 Z'
    const ring: Part[] = picked ? [{ d: 'M3 3 L37 3 L37 37 L3 37 Z', fill: '#FFF3C4' }] : []
    if (fill === 'none') return [...ring, { d: sq, fill: 'none' }]
    if (fill === 'scribble') return [...ring, { d: sq, fill: colour, hatch: true }]
    if (fill === 'solid') return [...ring, { d: sq, fill: colour }]
    return [...ring, { d: sq, fill: colour, opacity: 0.4 }, { d: 'M12 12 L28 12 L28 28 L12 28 Z', fill: colour, opacity: 0.3 }]
  }, [fill, colour, picked])
  return (
    <button type="button" onClick={onPick} aria-label={`${fill} fill`} aria-pressed={picked} className="shrink-0 w-10 h-10">
      <Doodle parts={parts} box="0 0 40 40" seed={fill.length + 11} className="w-full h-full" />
    </button>
  )
})

const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0`

/** The palette that opens the mixing shelf, with a dab of whatever's in the dish. */
export function PaletteKnob({ open, colour, onPick }: { open: boolean; colour: string | null; onPick: () => void }) {
  const parts = useMemo<Part[]>(
    () => [
      ...(open ? [{ d: 'M20 0.5 A19.5 19.5 0 1 0 20.1 0.5', fill: '#FFF3C4' } as Part] : []),
      { d: 'M20 6 C31 6 37 13 35 21 C34 26 28 25 27 29 C26 34 29 35 21 35 C11 35 5 28 5 20 C5 12 12 6 20 6 Z', fill: '#E9C99A' },
      { d: 'M23 28 A2.5 2.5 0 1 0 23.1 28', fill: '#FFFDF7' },
      { d: 'M12 15 A2.6 2.6 0 1 0 12.1 15', fill: '#E01848' },
      { d: 'M19 11 A2.6 2.6 0 1 0 19.1 11', fill: '#FDD835' },
      { d: 'M27 13 A2.6 2.6 0 1 0 27.1 13', fill: '#1976D2' },
      { d: 'M13 24 A4 4 0 1 0 13.1 24', fill: colour ?? '#FFFDF7' },
    ],
    [open, colour],
  )
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={open ? 'Put the mixing dish away' : 'Mix colours'}
      aria-pressed={open}
      className="shrink-0 w-11 h-11 transition-transform"
      style={{ transform: open ? 'translateY(-4px) rotate(-6deg) scale(1.1)' : undefined }}
    >
      <Doodle parts={parts} box="0 0 40 40" seed={7} width={open ? 2 : 1.4} className="w-full h-full" />
    </button>
  )
}

/** Where a dab landed in the dish, as a fraction of its width and height. */
export interface Landing {
  colour: string
  x: number
  y: number
  /** Counts up with every dab, so each one splashes. */
  n: number
}

// The dish, in its 160 × 96 box: a rim, and a well the paint sits in.
const W = { cx: 80, cy: 50, rx: 62, ry: 32 }

/**
 * The mixing dish: a big shallow dish of the paint he's mixed, big enough to
 * see the colour change. A dab dropped in splashes where it landed and swirls
 * into the middle as the paint turns; a finger dragged round it stirs.
 */
export function Dish({ colour, dabs, picked, hot, landing, onPick, dishRef }: { colour: string | null; dabs: [string, number][]; picked: boolean; hot: boolean; landing: Landing | null; onPick: () => void; dishRef: React.Ref<HTMLButtonElement> }) {
  const n = dabs.reduce((s, [, k]) => s + k, 0)
  const rim = useMemo<Part[]>(() => [...(picked ? [{ d: ellipse(80, 48, 79, 46), fill: '#FFF3C4' } as Part] : []), { d: ellipse(80, 48, 75, 41), fill: '#FFFDF7' }], [picked])
  const well = useMemo<Part[]>(() => [{ d: ellipse(W.cx, W.cy, W.rx, W.ry), fill: 'none', opacity: 0.7 }], [])
  // More dabs, more paint: it spreads towards the edge of the well.
  const fill = Math.min(1, 0.62 + 0.06 * n)

  const swirl = useRef<SVGGElement>(null)
  // The newest dab: from where it landed, round and into the middle.
  const spin = useRef<SVGGElement>(null)
  const drop = useRef<SVGCircleElement>(null)
  const at = landing && { x: W.cx + (landing.x - 0.5) * 2 * W.rx * 0.7, y: W.cy + (landing.y - 0.5) * 2 * W.ry * 0.7 }
  useEffect(() => {
    if (!landing || !at) return
    const t = { duration: 750, easing: 'ease-in', fill: 'forwards' as const }
    spin.current?.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(320deg)' }], t)
    drop.current?.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        { transform: `translate(${(W.cx - at.x) * 0.5}px, ${(W.cy - at.y) * 0.5}px) scale(0.8)`, opacity: 1 },
        { transform: `translate(${W.cx - at.x}px, ${W.cy - at.y}px) scale(0.2)`, opacity: 0 },
      ],
      t,
    )
    swirl.current?.animate([{ opacity: 0.2 }, { opacity: 0.7 }, { opacity: 0.5 }], { duration: 900 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landing?.n])

  // Stirring: the swirl follows his finger round the dish. A stir isn't a tap.
  const stir = useRef<{ id: number; a: number; turned: number; moved: boolean; x0: number; y0: number } | null>(null)
  const angle = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    return Math.atan2((e.clientY - r.top) / r.height - 0.5, (e.clientX - r.left) / r.width - 0.5)
  }
  const turned = useRef(0)
  return (
    <button
      ref={dishRef}
      type="button"
      onClick={() => {
        if (stir.current?.moved) return
        onPick()
      }}
      onPointerDown={(e) => {
        if (!colour) return
        e.currentTarget.setPointerCapture(e.pointerId)
        stir.current = { id: e.pointerId, a: angle(e), turned: 0, moved: false, x0: e.clientX, y0: e.clientY }
      }}
      onPointerMove={(e) => {
        const s = stir.current
        if (!s || s.id !== e.pointerId) return
        if (!s.moved && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) < 10) return
        s.moved = true
        const a = angle(e)
        let d = a - s.a
        if (d > Math.PI) d -= 2 * Math.PI
        if (d < -Math.PI) d += 2 * Math.PI
        s.a = a
        turned.current += (d * 180) / Math.PI
        swirl.current?.setAttribute('transform', `rotate(${turned.current.toFixed(1)} ${W.cx} ${W.cy})`)
      }}
      onPointerUp={() => window.setTimeout(() => (stir.current = null))}
      onPointerCancel={() => (stir.current = null)}
      aria-label={colour ? 'Paint with the mixed colour' : 'Empty mixing dish'}
      aria-pressed={picked}
      className="shrink-0 w-44 h-[106px] sm:w-56 sm:h-[134px] touch-none transition-transform duration-150"
      style={{ transform: hot ? 'scale(1.06)' : undefined }}
    >
      <div className="relative w-full h-full">
        <Doodle parts={rim} box="0 0 160 96" seed={31} width={picked ? 2.2 : 1.4} className="absolute inset-0 w-full h-full drop-shadow" />
        <svg viewBox="0 0 160 96" className="absolute inset-0 w-full h-full" aria-hidden="true">
          <ellipse cx={W.cx} cy={W.cy} rx={W.rx} ry={W.ry} fill="#000" fillOpacity={0.04} />
          {colour && (
            <ellipse
              cx={W.cx}
              cy={W.cy}
              rx={W.rx}
              ry={W.ry}
              style={{ fill: colour, transform: `scale(${fill})`, transformOrigin: `${W.cx}px ${W.cy}px`, transition: 'fill 650ms ease 250ms, transform 400ms ease-out' }}
            />
          )}
          {colour && (
            <g ref={swirl} opacity={0.5}>
              <path d={`M80 50 q8 -6 16 0 q4 9 -12 12 q-20 0 -20 -12 q3 -15 26 -13 q22 3 22 15`} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}
          {landing && at && (
            <g key={landing.n} ref={spin} style={{ transformOrigin: `${W.cx}px ${W.cy}px` }}>
              <circle ref={drop} cx={at.x} cy={at.y} r={11} fill={landing.colour} stroke={INK} strokeWidth={0.8} style={{ transformOrigin: `${at.x}px ${at.y}px`, opacity: 0 }} />
            </g>
          )}
        </svg>
        <Doodle parts={well} box="0 0 160 96" seed={33} width={1.2} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>
    </button>
  )
}

/** What went into the dish: a row of dots for each colour, one dot a dab. */
export function Recipe({ dabs }: { dabs: [string, number][] }) {
  return (
    <div className="flex flex-col justify-center gap-1 max-w-28 sm:max-w-40" aria-label="What's in the dish">
      {dabs.map(([c, k]) => (
        <div key={c} className="flex flex-wrap gap-0.5">
          {Array.from({ length: k }, (_, i) => (
            <svg key={i} viewBox="0 0 20 20" className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true">
              <circle cx={10} cy={10} r={8} fill={c} stroke={INK} strokeWidth={1.2} />
            </svg>
          ))}
        </div>
      ))}
    </div>
  )
}
