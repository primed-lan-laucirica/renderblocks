import type { GameProps } from '@renderblocks/kernel'
import { DrillGame, type DrillConfig } from '@renderblocks/drill'

const config: DrillConfig = {
  symbol: '÷',
  keyLabel: 'Divide by',
  keys: Array.from({ length: 12 }, (_, i) => i + 1),
  stepsPerKey: 12,
  // Inverse times tables: (key×1)÷key … (key×12)÷key, quotients 1–12.
  operands: (key, stepIndex) => ({
    a: key * (stepIndex + 1),
    b: key,
    answer: stepIndex + 1,
  }),
  completeMessage: (key) => `Divide by ${key} done!`,
  nextMessage: (nextKey) =>
    nextKey === 1 ? 'Starting over from 1…' : `Now dividing by ${nextKey}…`,
  palette: 'rose',
  audioBase: '/games/divide/audio',
}

export default function App({ services }: GameProps) {
  return <DrillGame services={services} config={config} />
}
