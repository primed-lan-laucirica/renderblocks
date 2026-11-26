#!/usr/bin/env node
/**
 * Proximal Master Corpus Harvester (Uncapped, Multi-Subject, Incremental-Ready)
 *
 * Harvests video inventories across all curated educational channels (PreK -> University),
 * merges the 97 Symbols Deep Dives and curated Great Stories picks, filters Shorts (<60s),
 * promos, livestreams, and non-English uploads, verifies YouTube embeddability + true channel
 * ownership via oEmbed (reusing cached verifications across runs), and writes
 * `tools/proximal/cache/master-harvested.json`.
 */
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { MASTER_CHANNELS } from './channels_master.mjs'
import { extractMetadata } from './taxonomy_master.mjs'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const CACHE_DIR = path.join(__dirname, 'cache')
const YTDLP = process.env.YTDLP || '/home/primed/.local/bin/yt-dlp'

const PROMO_RE =
  /\b(kids club|gift a membership|membership tour|channel trailer|official trailer|teaser|giveaway|merch|merchandise|toy unboxing|plush|magazine|dvd trailer|app trailer|subscribe to|live stream|livestream|bloopers|outtakes|patreon|q&a|q & a|ama|announcement|channel update|thank you for \d|subscriber special|español|spanish|en español|français|português|deutsch|italiano|arabic|hindi|russian|turkish|indonesian|vietnamese|korean|japanese)\b/i

const COMPILATION_RE =
  /\b(compilation|marathon|collection|full movie|learn-a-thon|1 hour|2 hours|30 mins|40 mins|50\+ mins|mega pack|bundle|all episodes|full course)\b/i

const SEASONAL_RE =
  /\b(halloween|spooky|trick or treat|christmas|santa|festive|easter|valentine|thanksgiving|back to school|summer vacation|april fools)\b/i

const NON_LATIN_RE = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/

function isCleanEducational(title) {
  if (!title || title === '[Private video]' || title === '[Deleted video]') return false
  if (PROMO_RE.test(title)) return false
  if (NON_LATIN_RE.test(title)) return false
  return true
}

function normalizeTitleKey(title) {
  return title
    .toLowerCase()
    .replace(/\|.*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function runYtDlp(targetUrl, limit) {
  const args = ['--flat-playlist', '--no-warnings', '-J']
  if (limit) args.push('--playlist-items', `1:${limit}`)
  args.push(targetUrl)
  try {
    const { stdout } = await execFileAsync(YTDLP, args, { maxBuffer: 96 * 1024 * 1024, timeout: 95_000 })
    const line = stdout
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('{'))
    return line ? JSON.parse(line) : { entries: [] }
  } catch (err) {
    console.warn(`  [warn] yt-dlp failed for ${targetUrl}: ${err.message.slice(0, 140)}`)
    return { entries: [] }
  }
}

async function mapLimit(items, concurrency, fn) {
  const results = new Array(items.length)
  let idx = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

async function loadExistingCache() {
  const verifiedById = new Map()
  for (const fname of ['master-harvested.json', 'harvested.json']) {
    try {
      const raw = JSON.parse(await fs.readFile(path.join(CACHE_DIR, fname), 'utf8'))
      for (const v of raw.videos || []) {
        if (v?.id && !verifiedById.has(v.id)) {
          verifiedById.set(v.id, v)
        }
      }
    } catch {
      // Cache file not present yet
    }
  }
  return verifiedById
}

async function loadSymbolsDives() {
  const { createServer } = await import('vite')
  const symbolsRoot = path.join(ROOT, 'packages/games/symbols')
  const server = await createServer({ root: symbolsRoot, logLevel: 'error', server: { middlewareMode: true } })
  const { DIVES } = await server.ssrLoadModule('/src/data/dives.ts')
  await server.close()

  const symbolsPath = path.join(symbolsRoot, 'src/data/symbols.json')
  const ranks = JSON.parse(await fs.readFile(symbolsPath, 'utf8'))
  const rankMap = new Map(ranks.map((r) => [r.rank, r]))

  const byId = new Map()
  for (const [rankStr, list] of Object.entries(DIVES)) {
    const rank = Number(rankStr)
    const rInfo = rankMap.get(rank)
    for (const d of list) {
      const prev = byId.get(d.id)
      const rankLabel = rInfo ? `Rank ${rank}: ${rInfo.name}` : `Rank ${rank}`
      if (!prev) {
        const segmentLen = (d.end ?? d.len) - (d.start ?? 0)
        const levelBand = rank <= 4 ? 'g3_5' : rank <= 11 ? 'g6_8' : rank <= 25 ? 'hs' : 'university'
        const concepts =
          rank <= 4
            ? ['addition', 'multiplication', 'fractions']
            : rank <= 11
              ? ['place-value', 'algebra-equations']
              : ['deep-math']
        byId.set(d.id, {
          id: d.id,
          title: d.title,
          channel: d.by,
          channelKey: 'symbols-dives',
          channelId: null,
          role: 'curated',
          subjects: ['math'],
          concepts,
          needs: rank <= 6 ? ['counting'] : ['algebra-equations'],
          levelBand,
          duration: Math.max(60, segmentLen || d.len || 600),
          fullDuration: d.len,
          start: d.start,
          end: d.end,
          viewCount: 500_000,
          description: `Symbols Deep Dive (${rankLabel}${d.on ? ` — ${d.on}` : ''}). Stage: ${rInfo?.stageName ?? 'Mathematics'}.`,
          symbolsRanks: [rank],
          format: 'episode',
          curatedSource: 'symbols-dives',
        })
      } else {
        if (!prev.symbolsRanks.includes(rank)) prev.symbolsRanks.push(rank)
      }
    }
  }
  return [...byId.values()]
}

async function loadGreatStoriesSeed() {
  const seedPath = path.join(__dirname, 'great_stories_seed.json')
  try {
    const rows = JSON.parse(await fs.readFile(seedPath, 'utf8'))
    const dummyCfg = {
      primarySubject: 'world-history',
      defaultBand: 'k_2',
      defaultConcepts: ['great-stories'],
    }
    return rows.map((r) => {
      const meta = extractMetadata(`${r.title} ${r.topic}`, '', dummyCfg)
      if (!meta.concepts.includes('great-stories')) {
        meta.concepts = ['great-stories', ...meta.concepts.slice(0, 3)]
      }
      if (!meta.subjects.includes('world-history')) {
        meta.subjects = ['world-history', ...meta.subjects]
      }
      const band = /children directly/i.test(r.audience)
        ? meta.levelBand === 'university' || meta.levelBand === 'hs'
          ? 'g3_5'
          : meta.levelBand
        : meta.levelBand
      return {
        id: r.id,
        title: r.title,
        channel: r.channel,
        channelKey: 'great-stories-curated',
        channelId: null,
        role: 'curated',
        subjects: meta.subjects,
        concepts: meta.concepts,
        needs: meta.needs,
        levelBand: band,
        duration: 300,
        viewCount: 100_000,
        description: `Great Stories & Cosmic Education (${r.topic}).`,
        format: 'episode',
        curatedSource: 'great-stories',
      }
    })
  } catch {
    return []
  }
}

const CHANNEL_CFG_BY_ID = new Map(MASTER_CHANNELS.map((c) => [c.id, c]))

async function checkOembed(video, cachedVerified) {
  const cached = cachedVerified.get(video.id)
  const cfg = CHANNEL_CFG_BY_ID.get(video.channelKey)
  const expectedRe = cfg?.expectedChannelMatch

  if (cached && cached.channel) {
    if (!expectedRe || expectedRe.test(cached.channel)) {
      return {
        ...video,
        title: video.title || cached.title,
        channel: cached.channel,
        firstSeenAt: cached.firstSeenAt || cached.harvestedAt || new Date().toISOString(),
      }
    }
  }

  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${video.id}`)}&format=json`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const data = await res.json()
    const author = (data.author_name || video.channel || '').trim()
    if (expectedRe && !expectedRe.test(author)) {
      return null
    }
    return {
      ...video,
      title: video.title || data.title,
      channel: author || video.channel,
      firstSeenAt: cached?.firstSeenAt || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

async function main() {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  const nowIso = new Date().toISOString()

  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const onlySet = onlyArg
    ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean))
    : null
  const retagOnly = process.argv.includes('--retag-only')

  const cachedVerified = await loadExistingCache()
  console.log(`Loaded ${cachedVerified.size} previously verified video IDs from cache.`)

  const activeChannels = retagOnly
    ? []
    : onlySet
      ? MASTER_CHANNELS.filter((c) => onlySet.has(c.id))
      : MASTER_CHANNELS

  const tasks = []
  for (const ch of activeChannels) {
    for (const src of ch.sources) {
      tasks.push({ ch, src })
    }
  }

  console.log(`Harvesting ${tasks.length} sources across ${activeChannels.length} channels...`)
  const rawBatches = await mapLimit(tasks, 8, async ({ ch, src }) => {
    const target = src.kind === 'tab' ? src.url : `ytsearch${src.limit}:${src.query}`
    const data = await runYtDlp(target, src.kind === 'tab' ? src.limit : undefined)
    const entries = Array.isArray(data.entries) ? data.entries : []
    const topChannel = data.channel || data.uploader || ch.name
    const topChannelId = data.channel_id || ch.channelId || null
    console.log(`  [${ch.id}] ${src.kind === 'tab' ? 'tab' : `"${src.query.slice(0, 42)}…"`} -> ${entries.length} entries`)
    return { ch, src, entries, topChannel, topChannelId }
  })

  const byId = new Map()
  const statsByChannel = new Map(
    MASTER_CHANNELS.map((c) => [c.id, { raw: 0, keptPreOembed: 0, shortsDropped: 0, filterDropped: 0 }]),
  )

  for (const { ch, src, entries, topChannel, topChannelId } of rawBatches) {
    const st = statsByChannel.get(ch.id)
    for (const e of entries) {
      if (!e || !e.id || e.id.length !== 11) continue
      st.raw++

      if (e.live_status === 'is_live' || e.live_status === 'is_upcoming') continue
      if (e.availability && e.availability !== 'public' && e.availability !== 'unlisted') continue

      const entryChId = e.channel_id || (src.kind === 'tab' ? topChannelId : null)
      const entryChName = e.channel || e.uploader || (src.kind === 'tab' ? topChannel : ch.name)
      if (src.kind === 'search') {
        if (ch.channelId && entryChId && entryChId !== ch.channelId) continue
        if (ch.expectedChannelMatch && entryChName && !ch.expectedChannelMatch.test(entryChName)) continue
      }

      const duration = Number(e.duration) || 0
      if (duration > 0 && duration < 60) {
        st.shortsDropped++
        continue
      }
      if (duration === 0) continue

      const title = (e.title || '').trim()
      const description = (e.description || '').trim()
      if (!isCleanEducational(title)) {
        st.filterDropped++
        continue
      }

      if (byId.has(e.id)) {
        const existing = byId.get(e.id)
        if (!existing.description && description) existing.description = description
        if ((Number(e.view_count) || 0) > (existing.viewCount || 0)) {
          existing.viewCount = Number(e.view_count) || 0
        }
        continue
      }

      const meta = extractMetadata(title, description, ch)
      const format = duration >= 1500 || COMPILATION_RE.test(title) ? 'compilation' : 'episode'
      const seasonal = SEASONAL_RE.test(title)

      byId.set(e.id, {
        id: e.id,
        title,
        channel: ch.name,
        channelKey: ch.id,
        channelId: entryChId || ch.channelId || null,
        role: ch.role,
        subjects: meta.subjects,
        concepts: meta.concepts,
        needs: meta.needs,
        levelBand: meta.levelBand,
        duration,
        viewCount: Number(e.view_count) || 0,
        description,
        format,
        seasonal: seasonal || undefined,
      })
      st.keptPreOembed++
    }
  }

  // Merge in existing verified videos from v1 cache if not re-fetched (preserves cumulative pool!)
  let preservedFromCache = 0
  for (const [id, old] of cachedVerified.entries()) {
    if (byId.has(id)) continue
    const chKey = old.channelKey === 'khan-math' ? 'khan-academy' : old.channelKey === 'pbs-kids-math' ? 'pbs-kids' : old.channelKey
    const cfg = CHANNEL_CFG_BY_ID.get(chKey)
    if (!cfg) continue
    if (!isCleanEducational(old.title)) continue
    const meta = extractMetadata(old.title, old.description || '', cfg)
    byId.set(id, {
      id,
      title: old.title,
      channel: old.channel || cfg.name,
      channelKey: chKey,
      channelId: old.channelId || cfg.channelId || null,
      role: cfg.role,
      subjects: meta.subjects,
      concepts: meta.concepts,
      needs: meta.needs,
      levelBand: meta.levelBand,
      duration: old.duration || 180,
      viewCount: old.viewCount || 0,
      description: old.description || '',
      format: old.format || 'episode',
      seasonal: SEASONAL_RE.test(old.title) || undefined,
    })
    preservedFromCache++
  }
  console.log(`Preserved ${preservedFromCache} additional verified videos from prior cache.`)

  // Merge Symbols Deep Dives
  const symbolsVideos = await loadSymbolsDives()
  let symbolsAdded = 0
  for (const sv of symbolsVideos) {
    if (!byId.has(sv.id)) {
      byId.set(sv.id, sv)
      symbolsAdded++
    } else {
      const existing = byId.get(sv.id)
      existing.symbolsRanks = sv.symbolsRanks
      if (sv.start !== undefined) existing.start = sv.start
      if (sv.end !== undefined) existing.end = sv.end
    }
  }
  console.log(`Merged Symbols Deep Dives (${symbolsVideos.length} total, ${symbolsAdded} new unique IDs).`)

  // Merge Great Stories curated picks
  const greatStories = await loadGreatStoriesSeed()
  let gsAdded = 0
  for (const gv of greatStories) {
    if (!byId.has(gv.id)) {
      byId.set(gv.id, gv)
      gsAdded++
    } else {
      const existing = byId.get(gv.id)
      if (!existing.concepts.includes('great-stories')) {
        existing.concepts = [...existing.concepts, 'great-stories'].slice(0, 4)
      }
      existing.curatedSource = existing.curatedSource || 'great-stories'
    }
  }
  console.log(`Merged Great Stories seed (${greatStories.length} total, ${gsAdded} new unique IDs).`)

  // Deduplicate exact normalized title collisions within the same channel (prefer higher viewCount)
  const dedupMap = new Map()
  for (const v of byId.values()) {
    const key = `${v.channelKey}::${normalizeTitleKey(v.title)}`
    const prev = dedupMap.get(key)
    if (!prev || (v.viewCount || 0) > (prev.viewCount || 0)) {
      dedupMap.set(key, v)
    }
  }
  const candidates = [...dedupMap.values()]
  console.log(`Pre-oEmbed unique videos after dedupe: ${candidates.length}`)

  // Verify oEmbed embeddability & true channel ownership
  console.log(`Verifying YouTube oEmbed embeddability (32 concurrent workers)...`)
  const checked = await mapLimit(candidates, 32, (v) => checkOembed(v, cachedVerified))
  const verified = checked.filter(Boolean)
  console.log(
    `Verified embeddable videos: ${verified.length} (${candidates.length - verified.length} non-embeddable/author-mismatched dropped)`,
  )

  const outPath = path.join(CACHE_DIR, 'master-harvested.json')
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        harvestedAt: nowIso,
        channelCount: MASTER_CHANNELS.length,
        channelStats: Object.fromEntries(statsByChannel),
        totalVerified: verified.length,
        videos: verified,
      },
      null,
      2,
    ),
  )
  console.log(`Saved ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
