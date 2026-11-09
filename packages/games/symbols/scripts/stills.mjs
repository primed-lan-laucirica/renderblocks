// Print, for each explainer, the times worth looking at: the end of every step, and each turn as it is offered and answered.
//
//   node scripts/stills.mjs [r01 …]      →  r01 3.2,7.9,…   (feed to render.mjs --stills)
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const want = process.argv.slice(2).filter((a) => /^r\d+$/.test(a))
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true } })
const { EXPLAINERS } = await server.ssrLoadModule('/src/explainers/index.ts')
await server.close()

for (const e of EXPLAINERS) {
  if (want.length && !want.includes(e.id)) continue
  const times = new Set()
  for (const t of e.ends) times.add(t + 0.3)
  for (const x of e.turns) {
    times.add(x.time + 0.6)
    if (x.turn.kind !== 'read') times.add(Math.min(x.demoAt + 1, x.resume - 0.05))
  }
  console.log(e.id, [...times].sort((a, b) => a - b).map((t) => t.toFixed(2)).join(','))
}
