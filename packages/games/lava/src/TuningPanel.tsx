import { DEFAULTS, SLIDERS, type LavaConfig } from './config'

interface TuningPanelProps {
  config: LavaConfig
  onChange: (config: LavaConfig) => void
  onClose: () => void
}

/** Hidden parent panel (spec 9): every tunable, applied live and saved. */
export function TuningPanel({ config, onChange, onClose }: TuningPanelProps) {
  const set = <K extends keyof LavaConfig>(key: K, value: LavaConfig[K]) => onChange({ ...config, [key]: value })

  return (
    <div className="fixed inset-0 z-20 bg-black/50 flex justify-end" onClick={onClose}>
      <div
        className="h-full w-full max-w-sm overflow-y-auto bg-slate-900 text-slate-100 p-4 flex flex-col gap-3 text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">LavaBlocks tuning</h2>
          <button type="button" onClick={onClose} className="px-3 py-1 rounded-lg bg-white/10 font-bold">
            Done
          </button>
        </div>

        <div className="flex gap-2">
          {(['gentle', 'whip'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set('dragStrength', s)}
              className={`flex-1 py-2 rounded-lg font-bold capitalize ${
                config.dragStrength === s ? 'bg-orange-500' : 'bg-white/10'
              }`}
            >
              {s} drag
            </button>
          ))}
        </div>

        {SLIDERS.map(([key, label, min, max, step]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="flex justify-between">
              <span>{label}</span>
              <span className="tabular-nums font-bold">{String(config[key])}</span>
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={config[key] as number}
              onChange={(e) => set(key, Number(e.target.value) as never)}
              className="accent-orange-500"
            />
          </label>
        ))}

        <label className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={config.debug} onChange={(e) => set('debug', e.target.checked)} />
          Show debug (collider outlines, fps)
        </label>

        <button type="button" onClick={() => onChange({ ...DEFAULTS })} className="py-2 rounded-lg bg-rose-600 font-bold">
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
