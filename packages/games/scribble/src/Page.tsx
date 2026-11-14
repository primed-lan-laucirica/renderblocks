import type { Ref } from 'react'
import { PROMPT, pathOf, type Layout, type Stroke } from './model'

const CHALK = '#F8FAFC'
/** How thick his chalk is, in box sides. */
export const NIB = 0.06

/**
 * The page: empty boxes drawn in chalk, the example of each written directly
 * above it, and his writing. Nothing but his writing is ever drawn in a box;
 * the box whose turn it is has a brighter edge, and its example is yellow.
 */
export function Page({ lay, ink, live, current, examples = true, svgRef, className, ...rest }: { lay: Layout; ink: Stroke[]; live?: number[] | null; current?: number; examples?: boolean; svgRef?: Ref<SVGSVGElement>; className?: string } & React.SVGProps<SVGSVGElement>) {
  // (The baseline sits far enough above the box that a tail, as on p or j, stays out of it.)
  return (
    <svg ref={svgRef} viewBox={`0 0 ${lay.w} ${lay.h}`} className={className} {...rest}>
      {examples && (
        <g fontFamily="Nunito, system-ui, sans-serif" fontWeight={800} textAnchor="middle">
          {lay.boxes.map((b, i) =>
            b.ch.trim() ? (
              <text key={i} data-example={i} x={b.x + 0.5} y={b.y - 0.17} fontSize={PROMPT * 0.78 * (b.ch.length > 2 ? 2 / b.ch.length : 1)} fill={i === current ? '#FDE047' : CHALK} fillOpacity={i === current ? 1 : 0.8}>
                {b.ch}
              </text>
            ) : null,
          )}
        </g>
      )}
      {lay.boxes.map((b, i) => (
        <rect key={i} data-box={i} data-current={i === current || undefined} x={b.x} y={b.y} width={1} height={1} rx={0.03} fill={i === current ? 'rgba(253,224,71,0.07)' : 'none'} stroke={i === current ? '#FDE047' : CHALK} strokeOpacity={i === current ? 1 : 0.75} strokeWidth={i === current ? 0.045 : 0.025} />
      ))}
      <g fill="none" stroke={CHALK} strokeWidth={NIB} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.95}>
        {ink.map((k, i) => (
          <path key={i} d={pathOf(k.pts)} />
        ))}
        {live && live.length >= 2 && <path d={pathOf(live)} />}
      </g>
    </svg>
  )
}
