import type { GameProps } from '@renderblocks/kernel'
import { DrillGame, type DrillConfig } from '@renderblocks/drill'

const config: DrillConfig = {
  symbol: '−',
  keyLabel: 'Minus',
  keys: Array.from({ length: 10 }, (_, i) => i),
  stepsPerKey: 10,
  // "Minus key" facts: (key+0)−key … (key+9)−key, answers 0–9, never negative.
  operands: (key, stepIndex) => ({
    a: key + stepIndex,
    b: key,
    answer: stepIndex,
  }),
  minAnswer: 0,
  completeMessage: (key) => `Minus ${key} done!`,
  nextMessage: (nextKey) =>
    nextKey === 0 ? 'Starting over from 0…' : `Here comes minus ${nextKey}…`,
  palette: 'cyan',
  reveal: 'takeaway',
  audioBase: '/games/subtract/audio',
}

export default function App({ services }: GameProps) {
  return <DrillGame services={services} config={config} />
}
