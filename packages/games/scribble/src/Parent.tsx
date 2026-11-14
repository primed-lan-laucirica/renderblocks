import { customPage, MOST_CUSTOM, pageOf, PATH_LENGTH, type Settings } from './model'

/** For grown-ups: where he is on the path (or your own page), how the examples come, and how the turn passes. Kept between sessions. */
export function Parent({ settings, onSettings, onNewPage, onBack }: { settings: Settings; onSettings: (s: Settings) => void; onNewPage: () => void; onBack: () => void }) {
  const set = (patch: Partial<Settings>) => onSettings({ ...settings, ...patch })
  const chip = (on: boolean, label: string, pick: () => void, name: string) => (
    <button type="button" data-chip={name} onClick={pick} className={`h-12 px-4 rounded-xl font-bold shadow ${on ? 'bg-slate-700 text-white' : 'bg-white text-slate-500'}`}>
      {label}
    </button>
  )
  const here = pageOf({ ...settings, mode: 'path' })
  const row = 'flex flex-wrap items-center gap-2'
  const head = 'font-black text-slate-600 text-lg'
  const note = 'text-sm font-bold text-slate-400'
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
            {chip(settings.mode === 'path', 'The path', () => set({ mode: 'path' }), 'path')}
            {chip(settings.mode === 'custom', 'My own', () => set({ mode: 'custom' }), 'custom')}
          </div>
          {settings.mode === 'path' && (
            <>
              <div className={row}>
                <button type="button" data-less onClick={() => set({ level: Math.max(0, settings.level - 1) })} className="w-12 h-12 rounded-xl bg-white shadow text-2xl font-black text-slate-600" aria-label="One page back">
                  −
                </button>
                <span data-level className="min-w-24 text-center text-2xl font-black tabular-nums text-slate-700">
                  {Math.min(settings.level, PATH_LENGTH - 1) + 1} of {PATH_LENGTH}
                </span>
                <button type="button" data-more onClick={() => set({ level: Math.min(PATH_LENGTH - 1, settings.level + 1) })} className="w-12 h-12 rounded-xl bg-white shadow text-2xl font-black text-slate-600" aria-label="One page on">
                  +
                </button>
                <span className="font-black text-slate-500" data-preview>
                  {here.stage}: {here.items.join(' ')}
                </span>
              </div>
              <p className={note}>One box first, then more, up to 1–10 and A–H as on the chalkboard; then bigger numbers, words, sums, and other things (the date, a sentence, a time). A box holds a whole string: 10, cat and 2+3=5 are one box each. He can also pick any page on the path.</p>
            </>
          )}
          {settings.mode === 'custom' && (
            <>
              <input
                data-custom
                value={settings.custom}
                onChange={(e) => set({ custom: e.target.value.slice(0, MOST_CUSTOM * 3) })}
                placeholder="A date, a word, a sum…"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="h-14 px-4 rounded-2xl bg-white shadow text-2xl font-black text-slate-700 outline-none focus:ring-4 ring-slate-300"
              />
              <p className={note}>
                Each word, number or sum is one box (spaces between them), up to {MOST_CUSTOM} boxes ({customPage(settings.custom).items.length} now). It appears as the last window on the path.
              </p>
            </>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h2 className={head}>The example for each box is…</h2>
          <div className={row}>
            {chip(settings.prompt === 'both', 'Shown and spoken', () => set({ prompt: 'both' }), 'both')}
            {chip(settings.prompt === 'shown', 'Shown', () => set({ prompt: 'shown' }), 'shown')}
            {chip(settings.prompt === 'spoken', 'Spoken', () => set({ prompt: 'spoken' }), 'spoken')}
          </div>
          <p className={note}>Shown directly above its box, never inside it. Numbers, letters, sums and words are said whole; a word with no voice clip is only shown.</p>
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
            Start this page fresh
          </button>
        </section>
      </div>
    </div>
  )
}
