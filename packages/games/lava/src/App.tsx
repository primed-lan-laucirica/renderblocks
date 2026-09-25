import { useEffect, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { Battle } from './Battle'
import { loadConfig, saveConfig, type LavaConfig } from './config'
import { Selector } from './Selector'
import { spawnNumbers, type NumberRange, type SetId } from './sets'
import { TuningPanel } from './TuningPanel'

const SET_KEY = 'set'
const RANGE_KEY = 'range'

function loadRange(raw: string | null): NumberRange {
  try {
    const r = JSON.parse(raw ?? '') as NumberRange
    if (Number.isFinite(r.from) && Number.isFinite(r.to)) return r
  } catch {
    // Fall through to the default.
  }
  return { from: 1, to: 25 }
}

function App({ services }: GameProps) {
  const { storage } = services
  const [set, setSet] = useState<SetId>(() => (storage.get(SET_KEY) as SetId) || 'integers')
  const [range, setRange] = useState<NumberRange>(() => loadRange(storage.get(RANGE_KEY)))
  const [config, setConfig] = useState<LavaConfig>(() => loadConfig((k) => storage.get(k)))
  /** Battle values, or null on the selector. A new array remounts the battle. */
  const [battle, setBattle] = useState<number[] | null>(null)
  const [panel, setPanel] = useState(false)

  useEffect(() => {
    storage.set(SET_KEY, set)
    storage.set(RANGE_KEY, JSON.stringify(range))
  }, [storage, set, range])

  useEffect(() => saveConfig((k, v) => storage.set(k, v), config), [storage, config])

  // Back: battle -> selector -> home (spec 4).
  useEffect(
    () =>
      services.onBack(() => {
        if (panel) {
          setPanel(false)
          return true
        }
        if (battle) {
          setBattle(null)
          return true
        }
        return false
      }),
    [services, battle, panel],
  )

  return (
    <>
      {battle ? (
        <Battle
          values={battle}
          config={config}
          onAgain={() => setBattle(spawnNumbers(set, range, config.blockCap))}
          onNewBattle={() => setBattle(null)}
          onOpenPanel={() => setPanel(true)}
        />
      ) : (
        <Selector
          set={set}
          range={range}
          cap={config.blockCap}
          onChange={(s, r) => {
            setSet(s)
            setRange(r)
          }}
          onBattle={setBattle}
          onHome={services.exitToHome}
        />
      )}
      {panel && <TuningPanel config={config} onChange={setConfig} onClose={() => setPanel(false)} />}
    </>
  )
}

export default App
