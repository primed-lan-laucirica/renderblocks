import { useState } from 'react'
import type { Ctx } from './ctx'
import { balance, newId, redeem, type Reward } from './model'
import { playEffect } from './sounds'
import { Button, Card, Sheet } from './ui'

/**
 * Stars and rewards (spec 11–12), free. The maths is the point: stars laid
 * out in rows of ten, "20 − 13 = 7 more to go", and "13 − 10 = 3 ★ left"
 * when a parent approves spending them.
 */
export function Stars({ ctx }: { ctx: Ctx }) {
  const { data } = ctx
  const [who, setWho] = useState(data.profiles[0]?.id)
  const [editing, setEditing] = useState<Reward | null>(null)
  const [spent, setSpent] = useState<string | null>(null)
  const person = data.profiles.find((p) => p.id === who) ?? data.profiles[0]
  const have = balance(data, person.id)

  const buy = (r: Reward) => {
    if (have < r.cost) return
    ctx.askParent(() => {
      const next = redeem(data, person.id, r, ctx.today)
      if (!next) return
      ctx.update(() => next)
      playEffect('cheer', 0.8)
      setSpent(`${have} − ${r.cost} = ${have - r.cost} ★ left`)
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        {data.profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setWho(p.id)}
            className="rounded-full px-5 py-2 text-xl font-black border-4"
            style={{ borderColor: p.colour, background: p.id === person.id ? p.colour : 'var(--card)', color: p.id === person.id ? 'white' : p.colour }}
          >
            {p.name} · {balance(data, p.id)} ★
          </button>
        ))}
      </div>

      <Card className="p-5">
        <div className="text-5xl font-black tabular-nums" style={{ color: person.colour }}>
          {have} ★
        </div>
        <StarRows n={have} />
      </Card>

      {spent && (
        <Card className="p-4 text-3xl font-black tabular-nums text-center bg-amber-200 text-amber-950">
          🎉 {spent}
        </Card>
      )}

      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-black flex-1">Rewards</h2>
        <Button onClick={() => ctx.askParent(() => setEditing({ id: newId(), label: '', emoji: '🎁', cost: 10 }))}>{ctx.parent ? '+' : '🔒'} Reward</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.rewards.map((r) => {
          const enough = have >= r.cost
          return (
            <Card key={r.id} className={`p-4 flex flex-col gap-2 ${enough ? 'border-4 border-amber-400' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-5xl">{r.emoji}</span>
                <span className="text-2xl font-black flex-1">{r.label}</span>
                {ctx.parent && (
                  <Button kind="ghost" onClick={() => setEditing(r)} label="Edit">
                    ✏️
                  </Button>
                )}
              </div>
              <div className="text-xl font-black tabular-nums">Costs {r.cost} ★</div>
              {enough ? (
                <Button kind="primary" onClick={() => buy(r)} className="text-xl">
                  {ctx.parent ? '' : '🔒 '}Spend {r.cost} ★
                </Button>
              ) : (
                <div className="text-xl font-bold tabular-nums text-[var(--muted)]">
                  {r.cost} − {have} = {r.cost - have} more to go
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <History ctx={ctx} profile={person.id} />

      {editing && (
        <RewardEditor
          reward={editing}
          isNew={!data.rewards.some((r) => r.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            ctx.update((d) => ({ ...d, rewards: d.rewards.some((x) => x.id === r.id) ? d.rewards.map((x) => (x.id === r.id ? r : x)) : [...d.rewards, r] }))
            setEditing(null)
          }}
          onDelete={() => {
            ctx.update((d) => ({ ...d, rewards: d.rewards.filter((x) => x.id !== editing.id) }))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

/** Stars in rows of ten: count tens, then ones. */
function StarRows({ n }: { n: number }) {
  if (n <= 0) return null
  const shown = Math.min(n, 100)
  return (
    <div className="mt-3 flex flex-col gap-1">
      {Array.from({ length: Math.ceil(shown / 10) }, (_, row) => (
        <div key={row} className="flex items-center gap-1 text-2xl leading-none">
          {Array.from({ length: Math.min(10, shown - row * 10) }, (_, i) => (
            <span key={i} className={i === 4 ? 'mr-2' : ''}>
              ★
            </span>
          ))}
          <span className="ml-2 text-base font-black text-[var(--muted)] tabular-nums">{Math.min(shown, (row + 1) * 10)}</span>
        </div>
      ))}
      {n > 100 && <div className="text-base font-bold text-[var(--muted)]">… and {n - 100} more</div>}
    </div>
  )
}

function History({ ctx, profile }: { ctx: Ctx; profile: string }) {
  const [adjusting, setAdjusting] = useState(false)
  const entries = ctx.data.stars.filter((s) => s.profile === profile && (s.reward || s.note)).slice(-8).reverse()
  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-black flex-1">Spent and given</h3>
        <Button onClick={() => ctx.askParent(() => setAdjusting(true))}>{ctx.parent ? '±' : '🔒'} Stars</Button>
      </div>
      {entries.length === 0 && <div className="text-[var(--muted)] font-bold">Nothing yet.</div>}
      {entries.map((s, i) => (
        <div key={i} className="flex gap-3 font-bold tabular-nums">
          <span className="text-[var(--muted)] w-28">{s.date}</span>
          <span className="flex-1">{s.note}</span>
          <span className={s.stars < 0 ? 'text-rose-600' : 'text-emerald-600'}>
            {s.stars > 0 ? '+' : ''}
            {s.stars} ★
          </span>
        </div>
      ))}
      {adjusting && (
        <Sheet title="Give or take stars" onClose={() => setAdjusting(false)}>
          <div className="flex flex-wrap gap-2">
            {[-5, -1, 1, 5, 10].map((n) => (
              <Button
                key={n}
                kind={n > 0 ? 'primary' : 'plain'}
                className="text-2xl tabular-nums"
                onClick={() => {
                  ctx.update((d) => ({ ...d, stars: [...d.stars, { profile, stars: n, date: ctx.today, note: n > 0 ? 'Bonus stars' : 'Stars taken back' }] }))
                  setAdjusting(false)
                }}
              >
                {n > 0 ? '+' : ''}
                {n} ★
              </Button>
            ))}
          </div>
        </Sheet>
      )}
    </Card>
  )
}

const REWARD_EMOJI = ['🎁', '🛝', '📚', '🍦', '🎈', '🧸', '🎨', '🍪', '🚂', '🦖', '🏊', '🎬', '🧩', '⚽', '🍕', '🌳']

function RewardEditor({ reward, isNew, onSave, onDelete, onClose }: { reward: Reward; isNew: boolean; onSave: (r: Reward) => void; onDelete: () => void; onClose: () => void }) {
  const [r, setR] = useState(reward)
  return (
    <Sheet title={isNew ? 'New reward' : 'Edit reward'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <input value={r.label} onChange={(e) => setR({ ...r, label: e.target.value })} placeholder="Reward" className="rounded-2xl bg-[var(--card)] border border-[var(--line)] px-4 py-3 text-2xl font-bold" />
        <div className="flex flex-wrap gap-1">
          {REWARD_EMOJI.map((em) => (
            <button key={em} type="button" onClick={() => setR({ ...r, emoji: em })} className={`text-3xl rounded-xl p-1 ${r.emoji === em ? 'bg-[var(--soft)]' : ''}`}>
              {em}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-black">Costs</span>
          <Button onClick={() => setR({ ...r, cost: Math.max(1, r.cost - 5) })}>−5</Button>
          <Button onClick={() => setR({ ...r, cost: Math.max(1, r.cost - 1) })}>−1</Button>
          <span className="text-3xl font-black tabular-nums w-20 text-center">{r.cost} ★</span>
          <Button onClick={() => setR({ ...r, cost: r.cost + 1 })}>+1</Button>
          <Button onClick={() => setR({ ...r, cost: r.cost + 5 })}>+5</Button>
        </div>
        <div className="flex gap-3">
          <Button kind="primary" disabled={!r.label.trim()} onClick={() => onSave({ ...r, label: r.label.trim() })} className="text-xl px-6">
            Save
          </Button>
          {!isNew && (
            <Button kind="danger" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
