import { MOST_BOXES, MOST_CUSTOM, OWN_COUNT, tokensOf, typedTokens, type Settings } from './model'

/** For grown-ups: which set, how many boxes, how it is prompted, and how the turn passes. Kept between sessions. */
export function Parent({ settings, onSettings, onNewPage, onBack }: { settings: Settings; onSettings: (s: Settings) => void; onNewPage: () => void; onBack: () => void }) {
  const set = (patch: Partial<Settings>) => onSettings({ ...settings, ...patch })
  const chip = (on: boolean, label: string, pick: () => void, name?: string) => (
    <button type="button" data-chip={name ?? label} onClick={pick} className={`h-12 px-4 rounded-xl font-bold shadow ${on ? 'bg-slate-700 text-white' : 'bg-white text-slate-500'}`}>
      {label}
    </button>
  )
  const own = settings.set === 'custom' ? typedTokens(settings.custom).length || 10 : OWN_COUNT[settings.set]
  const n = tokensOf(settings).length
  const row = 'flex flex-wrap items-center gap-2'
  const head = 'font-black text-slate-600 text-lg'
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={onBack} className="w-12 h-12 rounded-full bg-white shadow text-2xl font-bold" aria-label="Back">
          ←
        </button>
        <div className="flex-1 text-center text-2xl font-black text-slate-600">For grown-ups</div>
        <div className="w-12" />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-8 flex flex-col gap-5 max-w-2xl w-full mx-auto">
        <section className="flex flex-col gap-2">
          <h2 className={head}>What to write</h2>
          <div className={row}>
            {chip(settings.set === 'numbers', 'Numbers 1–10', () => set({ set: 'numbers', count: null }), 'numbers')}
            {chip(settings.set === 'letters', 'Letters A–H', () => set({ set: 'letters', count: null }), 'letters')}
            {chip(settings.set === 'custom', 'My own', () => set({ set: 'custom', count: null }), 'custom')}
          </div>
          {settings.set === 'custom' && (
            <input
              data-custom
              value={settings.custom}
              onChange={(e) => set({ custom: e.target.value.slice(0, MOST_CUSTOM * 2), count: null })}
              placeholder="A date, a word, a name…"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-14 px-4 rounded-2xl bg-white shadow text-2xl font-black text-slate-700 outline-none focus:ring-4 ring-slate-300"
            />
          )}
          {settings.set === 'custom' && <p className="text-sm font-bold text-slate-400">One character a box (spaces are skipped), up to {MOST_CUSTOM}. Leave it empty for boxes with nothing asked.</p>}
        </section>
        <section className="flex flex-col gap-2">
          <h2 className={head}>How many boxes</h2>
          <div className={row}>
            <button type="button" data-less onClick={() => set({ count: Math.max(1, n - 1) })} className="w-12 h-12 rounded-xl bg-white shadow text-2xl font-black text-slate-600" aria-label="One box fewer">
              −
            </button>
            <span data-count className="w-14 text-center text-3xl font-black tabular-nums text-slate-700">
              {n}
            </span>
            <button type="button" data-more onClick={() => set({ count: Math.min(MOST_BOXES, n + 1) })} className="w-12 h-12 rounded-xl bg-white shadow text-2xl font-black text-slate-600" aria-label="One box more">
              +
            </button>
            {settings.count !== null && settings.count !== own && chip(false, `Back to ${own}`, () => set({ count: null }), 'own-count')}
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className={head}>What to write is…</h2>
          <div className={row}>
            {chip(settings.prompt === 'both', 'Shown and spoken', () => set({ prompt: 'both' }), 'both')}
            {chip(settings.prompt === 'shown', 'Shown', () => set({ prompt: 'shown' }), 'shown')}
            {chip(settings.prompt === 'spoken', 'Spoken', () => set({ prompt: 'spoken' }), 'spoken')}
          </div>
          <p className="text-sm font-bold text-slate-400">Shown above the boxes, never inside them. Numbers and letters can be spoken; other characters are only shown.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className={head}>The next box lights up…</h2>
          <div className={row}>
            {chip(settings.advance === 'pause', 'By itself, when he stops writing', () => set({ advance: 'pause' }), 'pause')}
            {chip(settings.advance === 'button', 'With a Next button', () => set({ advance: 'button' }), 'button')}
          </div>
        </section>
        <section>
          <button type="button" data-new onClick={onNewPage} className="h-14 px-5 rounded-2xl bg-white shadow font-black text-lg text-slate-700 active:scale-95">
            Start a new page
          </button>
        </section>
      </div>
    </div>
  )
}
