import { useState } from 'react'
import type { Ctx } from './ctx'
import { newId, type List } from './model'
import { playEffect } from './sounds'
import { Button, Card } from './ui'

/**
 * Lists (spec 13): grocery and to-do, with sections. Anyone can tick
 * (strikethrough); parents add, remove and clear.
 */
export function Lists({ ctx }: { ctx: Ctx }) {
  const { data } = ctx
  const [openId, setOpenId] = useState(data.lists[0]?.id)
  const [text, setText] = useState('')
  const [section, setSection] = useState('')
  const list = data.lists.find((l) => l.id === openId) ?? data.lists[0]

  const change = (fn: (l: List) => List) => ctx.update((d) => ({ ...d, lists: d.lists.map((l) => (l.id === list.id ? fn(l) : l)) }))
  const sections = list ? [...new Set(list.items.map((i) => i.section ?? ''))] : []

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-2 items-center">
        {data.lists.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setOpenId(l.id)}
            className={`rounded-full px-5 py-2 text-xl font-black border-2 ${l.id === list?.id ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--card)] border-[var(--line)]'}`}
          >
            {l.kind === 'grocery' ? '🛒' : '✅'} {l.title}
            <span className="ml-2 text-base opacity-80 tabular-nums">{l.items.filter((i) => !i.done).length}</span>
          </button>
        ))}
        <Button
          onClick={() =>
            ctx.askParent(() => {
              const l: List = { id: newId(), title: `List ${data.lists.length + 1}`, kind: 'todo', items: [] }
              ctx.update((d) => ({ ...d, lists: [...d.lists, l] }))
              setOpenId(l.id)
            })
          }
        >
          {ctx.parent ? '+' : '🔒'} List
        </Button>
      </div>

      {list && (
        <>
          {ctx.parent && (
            <Card className="p-3 flex flex-wrap gap-2 items-center">
              <input value={list.title} onChange={(e) => change((l) => ({ ...l, title: e.target.value }))} className="rounded-xl bg-[var(--bg)] border border-[var(--line)] px-3 py-2 font-black text-lg w-48" aria-label="List name" />
              <Button kind={list.kind === 'grocery' ? 'primary' : 'plain'} onClick={() => change((l) => ({ ...l, kind: 'grocery' }))}>
                🛒 Grocery
              </Button>
              <Button kind={list.kind === 'todo' ? 'primary' : 'plain'} onClick={() => change((l) => ({ ...l, kind: 'todo' }))}>
                ✅ To do
              </Button>
              <div className="flex-1" />
              <Button kind="danger" onClick={() => ctx.update((d) => ({ ...d, lists: d.lists.filter((l) => l.id !== list.id) }))}>
                Delete list
              </Button>
            </Card>
          )}

          {sections.map((sec) => (
            <Card key={sec || '-'} className="p-3 flex flex-col gap-1">
              {sec && <h3 className="text-lg font-black text-[var(--muted)] px-2">{sec}</h3>}
              {list.items
                .filter((i) => (i.section ?? '') === sec)
                .map((i) => (
                  <div key={i.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        playEffect(i.done ? 'no' : 'yes', 0.7)
                        change((l) => ({ ...l, items: l.items.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)) }))
                      }}
                      className="flex-1 flex items-center gap-3 text-left rounded-xl px-2 py-2"
                    >
                      <span className={`w-9 h-9 rounded-lg border-4 border-[var(--accent)] flex items-center justify-center text-white font-black ${i.done ? 'bg-[var(--accent)]' : ''}`}>{i.done ? '✓' : ''}</span>
                      <span className={`text-2xl font-bold ${i.done ? 'line-through opacity-50' : ''}`}>{i.text}</span>
                    </button>
                    {ctx.parent && (
                      <Button kind="ghost" label="Remove" onClick={() => change((l) => ({ ...l, items: l.items.filter((x) => x.id !== i.id) }))}>
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
            </Card>
          ))}
          {list.items.length === 0 && <Card className="p-6 text-center text-xl font-bold text-[var(--muted)]">This list is empty.</Card>}

          {ctx.parent ? (
            <Card className="p-3 flex flex-wrap gap-2 items-center">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
                placeholder="Add an item"
                className="flex-1 min-w-48 rounded-xl bg-[var(--bg)] border border-[var(--line)] px-3 py-2 text-xl font-bold"
              />
              <input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder={list.kind === 'grocery' ? 'Section (e.g. Fruit)' : 'Section'}
                list="sections"
                className="w-48 rounded-xl bg-[var(--bg)] border border-[var(--line)] px-3 py-2 text-lg font-bold"
              />
              <datalist id="sections">
                {sections.filter(Boolean).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <Button kind="primary" onClick={add}>
                Add
              </Button>
              <Button onClick={() => change((l) => ({ ...l, items: l.items.filter((i) => !i.done) }))}>Clear completed</Button>
            </Card>
          ) : (
            <Button onClick={() => ctx.askParent(() => {})} className="self-start">
              🔒 Add items
            </Button>
          )}
        </>
      )}
    </div>
  )

  function add() {
    const t = text.trim()
    if (!t || !list) return
    change((l) => ({ ...l, items: [...l.items, { id: newId(), text: t, section: section.trim() || undefined, done: false }] }))
    setText('')
  }
}
