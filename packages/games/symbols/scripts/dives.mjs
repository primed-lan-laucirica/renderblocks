// Ask YouTube whether every deep dive is still there and may still be played inside another page.
// It needs the internet, so it is not one of the tests.
//
//   pnpm --filter @renderblocks/symbols dives
//
// YouTube's oEmbed answers 200 for a video that can be embedded, 401 for one whose owner has
// turned embedding off, and 400 or 404 for one that is gone or private. A title or channel that
// has changed is printed too, since a video can be replaced under the same name.
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true } })
const { DIVES } = await server.ssrLoadModule('/src/data/dives.ts')
await server.close()

const ranksOf = new Map()
for (const [rank, list] of Object.entries(DIVES)) for (const d of list) ranksOf.set(d.id, { d, ranks: [...(ranksOf.get(d.id)?.ranks ?? []), rank] })

const WHY = { 401: 'embedding is turned off', 403: 'embedding is turned off', 400: 'no such video', 404: 'gone or private' }
let bad = 0
for (const { d, ranks } of ranksOf.values()) {
  const at = `${d.id}  rank ${ranks.join(', ')}  "${d.title}"`
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${d.id}`)}&format=json`)
    if (!res.ok) {
      bad++
      console.log(`FAIL  ${at}: ${res.status} ${WHY[res.status] ?? ''}`)
      continue
    }
    const { title, author_name: by } = await res.json()
    console.log(`ok    ${at}\n        YouTube: "${title}" (${by})`)
  } catch (err) {
    bad++
    console.log(`FAIL  ${at}: ${err.message}`)
  }
}
console.log(`\n${ranksOf.size} videos for ${Object.keys(DIVES).length} ranks; ${bad} failed`)
process.exit(bad ? 1 : 0)
