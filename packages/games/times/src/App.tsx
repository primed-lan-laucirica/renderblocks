import type { GameProps } from '@renderblocks/kernel'
import { DrillGame, type DrillConfig } from '@renderblocks/drill'

const config: DrillConfig = {
  symbol: '×',
  keyLabel: 'Table',
  keys: Array.from({ length: 12 }, (_, i) => i + 1),
  stepsPerKey: 12,
  operands: (key, stepIndex) => ({
    a: key,
    b: stepIndex + 1,
    answer: key * (stepIndex + 1),
  }),
  // Distractors must never be multiples of the key, so the table's
  // skip-count pattern is what finds the answer (1x table exempt).
  allowDistractor: (candidate, key) => key <= 1 || candidate % key !== 0,
  completeMessage: (key) => `${key} times table done!`,
  nextMessage: (nextKey) =>
    nextKey === 1 ? 'Starting over from 1…' : `Here come the ${nextKey}s…`,
  palette: 'emerald',
  reveal: 'rows',
  audioBase: '/games/times/audio',
}

export default function App({ services }: GameProps) {
  return <DrillGame services={services} config={config} />
}
