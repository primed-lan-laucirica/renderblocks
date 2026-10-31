import { useEffect, useState } from 'react'
import type { GameProps } from '@renderblocks/kernel'
import { Battle } from './Battle'
import { loadConfig, saveConfig, type LavaConfig } from './config'
import { LEVELS, type Level, type LevelId } from './levels'
import { River } from './River'
import { Selector } from './Selector'
import { spawnNumbers, type NumberRange, type SetId } from './sets'
import { TuningPanel } from './TuningPanel'

const SET_KEY = 'set'
const RANGE_KEY = 'range'
const PLAYED_KEY = 'played'

/** A battle under way: its blocks (a new array remounts it) and its level, null for a free battle. */
interface Play {
  values: number[]
  level: Level | null
}

function loadPlayed(raw: string | null): Set<LevelId> {
  try {
    const ids = JSON.parse(raw ?? '[]') as string[]
    return new Set(LEVELS.map((l) => l.id).filter((id) => ids.includes(id)))
  } catch {
    return new Set()
  }
}

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
  const [battle, setBattle] = useState<Play | null>(null)
  /** On the river, or in Free Battle's set and range picker. */
  const [free, setFree] = useState(false)
  const [played, setPlayed] = useState<Set<LevelId>>(() => loadPlayed(storage.get(PLAYED_KEY)))
  const [panel, setPanel] = useState(false)

  const start = (level: Level) => {
    if (level.id === 'free') {
      setFree(true)
    } else {
      setBattle({ values: level.values(!played.has(level.id)), level })
    }
    if (!played.has(level.id)) {
      const next = new Set(played).add(level.id)
      setPlayed(next)
      storage.set(PLAYED_KEY, JSON.stringify([...next]))
    }
  }

  useEffect(() => {
    storage.set(SET_KEY, set)
    storage.set(RANGE_KEY, JSON.stringify(range))
  }, [storage, set, range])

  useEffect(() => saveConfig((k, v) => storage.set(k, v), config), [storage, config])

  // Back: battle -> where it was started (free picker or river) -> river -> home.
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
        if (free) {
          setFree(false)
          return true
        }
        return false
      }),
    [services, battle, free, panel],
  )

  return (
    <>
      {battle ? (
        <Battle
          values={battle.values}
          set={battle.level ? 'integers' : set}
          config={config}
          level={battle.level}
          onAgain={() =>
            setBattle({
              values: battle.level ? battle.level.values(false) : spawnNumbers(set, range, config.blockCap),
              level: battle.level,
            })
          }
          onNewBattle={() => setBattle(null)}
          onOpenPanel={() => setPanel(true)}
        />
      ) : !free ? (
        <River played={played} onPick={start} onHome={services.exitToHome} />
      ) : (
        <Selector
          set={set}
          range={range}
          cap={config.blockCap}
          onChange={(s, r) => {
            setSet(s)
            setRange(r)
          }}
          onBattle={(values) => setBattle({ values, level: null })}
          onHome={() => setFree(false)}
        />
      )}
      {panel && <TuningPanel config={config} onChange={setConfig} onClose={() => setPanel(false)} />}
    </>
  )
}

export default App
