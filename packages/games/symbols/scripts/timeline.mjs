// Print an explainer's timeline: when each line is spoken, each turn, each act.
//
//   pnpm --filter @renderblocks/symbols timeline [r01 …]
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const want = process.argv.slice(2).filter((a) => /^r\d+$/.test(a))
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true } })
const { EXPLAINERS } = await server.ssrLoadModule('/src/explainers/index.ts')
await server.close()

const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`
for (const e of EXPLAINERS) {
  if (want.length && !want.includes(e.id)) continue
  console.log(`\n${e.id}  ${e.title}  ${clock(e.duration)}  poster ${clock(e.poster)}${e.unvoiced.length ? `  (${e.unvoiced.length} lines not voiced yet)` : ''}`)
  const rows = [
    ...e.acts.map((a) => ({ t: a.time, text: `── act ${a.act} ──` })),
    ...e.voice.map((v) => ({ t: v.time + 0.0001, text: `"${v.say}"` })),
    ...e.turns.map((x) => ({ t: x.time, text: `[${x.turn.kind} ${x.turn.id}] answer ${clock(x.demoAt)}, on from ${clock(x.resume)}` })),
  ].sort((a, b) => a.t - b.t)
  for (const r of rows) console.log(`  ${clock(r.t)}  ${r.text}`)
}
