import { motion } from 'framer-motion'

/**
 * The fact shown as countable cube groups (concrete -> abstract bridge).
 * `animate` true = the post-answer reveal (staged entrance, answer group
 * highlighted); false = the static hint after repeated misses (groups
 * countable, nothing highlighted).
 */
export type RevealKind = 'rows' | 'merge' | 'takeaway' | 'share'

interface FactRevealProps {
  kind: RevealKind
  a: number
  b: number
  answer: number
  cubeColor: string
  animate: boolean
  compact?: boolean
}

const ALT_COLOR = '#f59e0b'
const GREY_COLOR = '#94a3b8'

function cubeSize(cols: number, rows: number, compact: boolean): number {
  const maxSize = compact ? 14 : 22
  const maxWidth = compact ? 260 : 320
  const maxHeight = compact ? 96 : 150
  return Math.max(
    8,
    Math.min(maxSize, Math.floor(maxWidth / cols), Math.floor(maxHeight / rows)),
  )
}

function Cube({ size, color }: { size: number; color: string }) {
  return (
    <div
      className="rounded-[3px] shadow-sm shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  )
}

export function FactReveal({ kind, a, b, answer, cubeColor, animate, compact = false }: FactRevealProps) {
  const gapFor = (size: number) => Math.max(2, Math.round(size / 6))

  if (kind === 'rows') {
    // a rows of b cubes, rows entering one by one: 3 × 4 = three fours.
    const size = cubeSize(b, a, compact)
    const gap = gapFor(size)
    return (
      <div className="flex flex-col items-center" style={{ gap }}>
        {Array.from({ length: a }, (_, row) => (
          <motion.div
            key={row}
            className="flex"
            style={{ gap }}
            initial={animate ? { opacity: 0, x: -14 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: animate ? row * 0.09 : 0 }}
          >
            {Array.from({ length: b }, (_, col) => (
              <Cube key={col} size={size} color={cubeColor} />
            ))}
          </motion.div>
        ))}
      </div>
    )
  }

  if (kind === 'merge') {
    // Two color-distinct groups joining: a + b.
    const total = Math.max(a + b, 1)
    const size = cubeSize(Math.min(total, 10), Math.ceil(total / 10), compact)
    const gap = gapFor(size)
    return (
      <div
        className="flex flex-wrap items-center justify-center"
        style={{ gap: gap * 2, maxWidth: compact ? 280 : 360 }}
      >
        <motion.div
          className="flex flex-wrap justify-center"
          style={{ gap, maxWidth: compact ? 280 : 360 }}
          initial={animate ? { opacity: 0, x: -20 } : false}
          animate={{ opacity: 1, x: 0 }}
        >
          {Array.from({ length: a }, (_, i) => (
            <Cube key={i} size={size} color={cubeColor} />
          ))}
        </motion.div>
        {b > 0 && (
          <motion.div
            className="flex flex-wrap justify-center"
            style={{ gap, maxWidth: compact ? 280 : 360 }}
            initial={animate ? { opacity: 0, x: 24 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: animate ? 0.25 : 0 }}
          >
            {Array.from({ length: b }, (_, i) => (
              <Cube key={i} size={size} color={ALT_COLOR} />
            ))}
          </motion.div>
        )}
      </div>
    )
  }

  if (kind === 'takeaway') {
    // a cubes; the last b grey out and sink: a − b leaves the colored ones.
    const size = cubeSize(Math.min(Math.max(a, 1), 10), Math.ceil(Math.max(a, 1) / 10), compact)
    const gap = gapFor(size)
    return (
      <div
        className="flex flex-wrap items-center justify-center"
        style={{ gap, maxWidth: compact ? 280 : 360 }}
      >
        {Array.from({ length: a }, (_, i) => {
          const taken = i >= a - b
          if (!taken) return <Cube key={i} size={size} color={cubeColor} />
          return (
            <motion.div
              key={i}
              initial={animate ? { opacity: 1, y: 0 } : false}
              animate={animate ? { opacity: 0.3, y: 6 } : { opacity: 0.3 }}
              transition={{ delay: animate ? 0.5 + (i - (a - b)) * 0.08 : 0 }}
            >
              <Cube size={size} color={GREY_COLOR} />
            </motion.div>
          )
        })}
        {a === 0 && <Cube size={size} color={GREY_COLOR} />}
      </div>
    )
  }

  // share: a cubes dealt into b columns of `answer`; first column highlighted.
  const size = cubeSize(b, Math.max(answer, 1), compact)
  const gap = gapFor(size)
  return (
    <div className="flex items-end justify-center" style={{ gap: gap * 2 }}>
      {Array.from({ length: b }, (_, col) => (
        <motion.div
          key={col}
          className="flex flex-col rounded-md"
          style={{
            gap,
            padding: gap,
            boxShadow: animate && col === 0 ? `0 0 0 3px ${ALT_COLOR}` : undefined,
          }}
          initial={animate ? { opacity: 0, y: -12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animate ? col * 0.09 : 0 }}
        >
          {Array.from({ length: answer }, (_, i) => (
            <Cube key={i} size={size} color={cubeColor} />
          ))}
        </motion.div>
      ))}
    </div>
  )
}
