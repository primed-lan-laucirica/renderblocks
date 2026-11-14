import type { Ref } from 'react'
import { pathOf, type Layout, type Stroke } from './model'

const CHALK = '#F8FAFC'
/** How thick his chalk is, in box sides. */
export const NIB = 0.06

/**
 * The page: empty boxes drawn in chalk, and his writing. Nothing else is ever
 * drawn in a box (no character, outline, dots or arrows): the one whose turn
 * it is only has a brighter edge.
 */
export function Page({ lay, ink, live, current, svgRef, className, ...rest }: { lay: Layout; ink: Stroke[]; live?: number[] | null; current?: number; svgRef?: Ref<SVGSVGElement>; className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg ref={svgRef} viewBox={`0 0 ${lay.w} ${lay.h}`} className={className} {...rest}>
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
