// Import the Math Symbols Learning Path (the sheet in RenderBlocks > Symbols)
// into src/data/symbols.json. The sheet is the source of truth for the ranks,
// their stages, their signs and what each depends on.
//
//   pnpm --filter @renderblocks/symbols import [path/to/export.csv]
//
// With no path it reads data/learning-path.csv: the sheet's first tab,
// exported as CSV (File > Download > Comma-separated values) and saved there.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const src = path.resolve(process.argv[2] ?? path.join(root, 'data/learning-path.csv'))
const out = path.join(root, 'src/data/symbols.json')

/** One CSV line into its cells (quoted cells may hold commas and doubled quotes). */
function cells(line) {
  const row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') cell += line[++i]
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else cell += c
  }
  row.push(cell)
  return row
}

/** "2–4" → [2, 3, 4]; "6, 9" → [6, 9]; "" → []. */
function ranks(text) {
  const list = []
  for (const part of text.split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*[–-]\s*(\d+)$/)
    if (m) for (let r = Number(m[1]); r <= Number(m[2]); r++) list.push(r)
    else if (/^\d+$/.test(part)) list.push(Number(part))
    else throw new Error(`Depends on: can't read "${part}"`)
  }
  return list
}

const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/).filter((l) => l.trim())
const head = cells(lines[0]).map((h) => h.trim())
const col = (name) => {
  const i = head.findIndex((h) => h.toLowerCase().startsWith(name))
  if (i < 0) throw new Error(`No "${name}" column in ${src}`)
  return i
}
const [cRank, cStage, cSymbol, cName, cDeps] = ['rank', 'stage', 'symbol', 'name', 'depends'].map(col)

const list = lines.slice(1).map((line) => {
  const row = cells(line)
  const m = row[cStage].trim().match(/^(\d+)\.\s*(.+)$/)
  if (!m) throw new Error(`Stage: can't read "${row[cStage]}"`)
  return {
    rank: Number(row[cRank]),
    stage: Number(m[1]),
    stageName: m[2],
    // The members of a family are set two or more spaces apart in the sheet.
    glyphs: row[cSymbol].trim().split(/\s{2,}/),
    name: row[cName].trim(),
    dependsOn: ranks(row[cDeps] ?? ''),
  }
})

// The sheet's own rule: ranks run 1, 2, 3 … and each depends only on ranks above it.
list.forEach((r, i) => {
  if (r.rank !== i + 1) throw new Error(`Row ${i + 2}: rank ${r.rank}, expected ${i + 1}`)
  for (const d of r.dependsOn) if (d >= r.rank) throw new Error(`Rank ${r.rank} depends on rank ${d}, which is not above it`)
})

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(list, null, 2) + '\n')
console.log(`${list.length} ranks in ${new Set(list.map((r) => r.stage)).size} stages → ${path.relative(root, out)}`)
