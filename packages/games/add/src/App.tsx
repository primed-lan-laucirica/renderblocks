import type { GameProps } from '@renderblocks/kernel'
import { DrillGame, type DrillConfig } from '@renderblocks/drill'

const config: DrillConfig = {
  symbol: '+',
  keyLabel: 'Plus',
  keys: Array.from({ length: 10 }, (_, i) => i),
  stepsPerKey: 10,
  operands: (key, stepIndex) => ({
    a: key,
    b: stepIndex,
    answer: key + stepIndex,
  }),
  minAnswer: 0,
  completeMessage: (key) => `Plus ${key} done!`,
  nextMessage: (nextKey) =>
    nextKey === 0 ? 'Starting over from 0…' : `Here comes plus ${nextKey}…`,
  palette: 'orange',
  reveal: 'merge',
  audioBase: '/games/add/audio',
}

export default function App({ services }: GameProps) {
  return <DrillGame services={services} config={config} />
}
