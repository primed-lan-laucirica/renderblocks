#!/usr/bin/env node
/**
 * Harvests video inventories across all Seed & Candidate channels via yt-dlp,
 * imports the 97 Symbols Deep Dives, filters Shorts (<60s), promos, and off-topic
 * uploads, and verifies YouTube embeddability via oEmbed.
 */
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { CHANNELS } from './channels.mjs'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const CACHE_DIR = path.join(__dirname, 'cache')
const YTDLP = process.env.YTDLP || '/home/primed/.local/bin/yt-dlp'

const PROMO_RE =
  /\b(kids club|gift a membership|membership tour|channel trailer|official trailer|teaser|giveaway|merch|toy unboxing|plush|magazine|dvd trailer|app trailer|subscribe to|live stream|livestream|bloopers|outtakes|español|spanish|en español|français|português|deutsch|italiano|arabic)\b/i

const COMPILATION_RE =
  /\b(compilation|marathon|collection|full movie|learn-a-thon|1 hour|2 hours|30 mins|40 mins|50\+ mins|mega pack|bundle)\b/i

// Strict math keywords for multi-subject channels (Homeschool Pop, Khan Academy, Jack Hartmann, Smile & Learn)
const MATH_STRICT_RE =
  /\b(math|maths|number|numbers|count|counting|subitiz\w*|ten frame|number bond|number line|tally|roman numeral|add|adding|addition|plus|sum|sums|subtract\w*|minus|take away|difference|multipl\w*|times table|product|array|arrays|divid\w*|division|quotient|remainder|fraction\w*|numerator|denominator|half|halves|quarter\w*|third\w*|decimal\w*|percent\w*|place value|ones|tens|hundreds|thousands|even and odd|odd and even|greater than|less than|equal|compar\w* numbers|skip count\w*|shape|shapes|geometry|polygon\w*|triangle\w*|square\w*|rectangle\w*|circle\w*|hexagon\w*|octagon\w*|3d shape|2d shape|cube\w*|sphere\w*|cylinder\w*|cone\w*|pyramid\w*|angle\w*|perimeter|area|volume|symmetry|measure\w*|inch\w*|centimeter\w*|meter\w*|ruler|weight|capacity|telling time|clock|analog|hour|minute|money|coin\w*|penny|nickel|dime|quarter|dollar|bar graph|pictograph|data|algebra|equation\w*|factor\w*|prime|exponent\w*|ratio\w*|proportion\w*|integer\w*|negative number|coordinate)\b/i

// Off-topic exclusions on multi-subject channels so false positives (e.g. " Roman Empire", "Quarter horse") don't slip through
const NON_MATH_EXCLUSION_RE =
  /\b(gas station|president\w*|states and capitals|solar system|planet\w*|dinosaur facts|civil war|revolutionary war|ancient egypt|ancient rome|halloween read-aloud|bedtime story|sight words|phonics song|letter [a-z]\b|alphabet song|parts of speech|noun\w*|verb\w*|adjective\w*|human body|photosynthesis|water cycle|continent\w*|ocean\w*|constitution|martin luther king|christopher columbus|george washington|abraham lincoln|thanksgiving history|groundhog day|valentine's day history|st\.? patrick)\b/i

// Broader math + logic + coding + patterns filter (Scratch Garden, Khan Kids, Kids Academy, PBS Kids)
const MATH_LOGIC_RE =
  new RegExp(
    MATH_STRICT_RE.source +
      '|\\b(pattern\\w*|sequenc\\w*|sort\\w*|logic|coding|code|program\\w*|algorithm\\w*|loop\\w*|debug\\w*|problem solving|mini math|peg \\+ cat|peg plus cat|cyberchase|bigger|smaller|taller|shorter|heavier|lighter|left and right|position|ordinal)\\b',
    'i',
  )

// Preschool Prep specific math filter: numbers, shapes, math facts, math drills, primary school prep math
const PRESCHOOL_PREP_MATH_RE =
  /\b(number\w*|math|addition|subtraction|multiplication|division|shapes|counting|drills|zero the baker|plus|minus|times|divid\w*|primary school prep)\b/i
const PRESCHOOL_PREP_EXCLUDE_RE =
  /\b(sight words|letter sounds|phonics|digraphs|blends|vowels|meet the colors|meet the letters|spanish)\b/i

export function passesTopicFilter(filterKind, title, description = '') {
  const text = `${title} ${description}`
  if (PROMO_RE.test(title)) return false

  switch (filterKind) {
    case 'all_clean':
      return true
    case 'preschool_prep_math':
      if (PRESCHOOL_PREP_EXCLUDE_RE.test(title) && !/\b(math|number|addition|subtraction|multiplication|division|shapes)\b/i.test(title)) {
        return false
      }
      return PRESCHOOL_PREP_MATH_RE.test(text)
    case 'math_strict':
      if (NON_MATH_EXCLUSION_RE.test(title)) return false
      return MATH_STRICT_RE.test(title) || (MATH_STRICT_RE.test(description) && !NON_MATH_EXCLUSION_RE.test(description))
    case 'math_logic':
      if (NON_MATH_EXCLUSION_RE.test(title)) return false
      return MATH_LOGIC_RE.test(title) || (MATH_LOGIC_RE.test(description) && !NON_MATH_EXCLUSION_RE.test(description))
    default:
      return true
  }
}

const CONCEPT_RULES = [
  { id: 'counting', label: 'Counting & Numbers', needs: [], re: /\b(count\w*|1 to 10|1 to 20|1 to 100|1-10|1-20|meet the numbers|how many|one|two|three|four|five|six|seven|eight|nine|ten|zero|tally|ordinal)\b/i },
  { id: 'number-sense', label: 'Number Sense & Subitizing', needs: ['counting'], re: /\b(subitiz\w*|ten frame|number bond\w*|number line|even and odd|odd and even|greater than|less than|compar\w*|more and less|number sense)\b/i },
  { id: 'skip-counting', label: 'Skip Counting', needs: ['counting'], re: /\b(skip count\w*|count by 2|count by 3|count by 4|count by 5|count by 10|counting by twos|counting by fives|counting by tens)\b/i },
  { id: 'addition', label: 'Addition', needs: ['counting'], re: /\b(add|adding|addition|plus|sum|sums|make 10|making 10|doubles|putting together)\b/i },
  { id: 'subtraction', label: 'Subtraction', needs: ['addition'], re: /\b(subtract\w*|minus|take away|taking away|difference|regrouping)\b/i },
  { id: 'math-facts', label: 'Math Facts Fluency', needs: ['addition'], re: /\b(math facts|math drills|fact family|fact families|mental math|flashcards|times table song)\b/i },
  { id: 'place-value', label: 'Place Value & Base 10', needs: ['counting'], re: /\b(place value|ones,? tens|hundreds|thousands|base 10|base ten|teen numbers|expanded form|rounding|roman numeral\w*)\b/i },
  { id: 'multiplication', label: 'Multiplication & Arrays', needs: ['addition', 'skip-counting'], re: /\b(multipl\w*|times table\w*|array\w*|groups of|square numbers|squares|repeated addition|factors|multiples|prime)\b/i },
  { id: 'division', label: 'Division & Sharing', needs: ['multiplication', 'subtraction'], re: /\b(divid\w*|division|quotient|remainder|fair share|sharing equally|long division)\b/i },
  { id: 'fractions', label: 'Fractions, Decimals & Percent', needs: ['division'], re: /\b(fraction\w*|half|halves|quarter\w*|third\w*|numerator|denominator|decimal\w*|percent\w*|improper|mixed number|ratio\w*|proportion\w*)\b/i },
  { id: 'shapes-geometry', label: 'Shapes & Geometry', needs: [], re: /\b(shape\w*|geometry|triangle\w*|square\w*|rectangle\w*|circle\w*|polygon\w*|hexagon\w*|octagon\w*|2d|3d|cube\w*|sphere\w*|cylinder\w*|cone\w*|angle\w*|symmetry|perimeter|area|volume|coordinate|transformation\w*)\b/i },
  { id: 'measurement-time-money', label: 'Time, Money & Measurement', needs: ['counting'], re: /\b(telling time|clock|hour|minute|money|coin\w*|penny|nickel|dime|dollar|measure\w*|length|inch\w*|centimeter\w*|meter\w*|weight|capacity|bar graph|pictograph|data)\b/i },
  { id: 'patterns-coding', label: 'Patterns, Logic & Coding', needs: [], re: /\b(pattern\w*|sequenc\w*|coding|code|program\w*|loop\w*|again!|debug\w*|do-block\w*|do block\w*|wonderblocks|go and stop|logic|puzzle\w*|riddle\w*|problem solving|algorithm\w*)\b/i },
  { id: 'phonics-reading', label: 'Phonics & Letter Sounds', needs: [], re: /\b(alphablocks|phonics|letter sound\w*|learn to read|spell\w*|blend\w*|vowel\w*|digraph\w*|a to z)\b/i },
  { id: 'colours-sorting', label: 'Colours & Sorting', needs: [], re: /\b(colourblocks|color\w*|colour\w*|rainbow|mix\w* colour|sorting)\b/i },
  { id: 'deep-math', label: 'Higher Math & Symbols', needs: ['fractions', 'multiplication'], re: /\b(algebra|calculus|derivative\w*|integral\w*|limit\w*|vector\w*|matrix|matrices|linear|probability|bayes|theorem|proof|infinity|logarithm|euler|trigonometry|sine|cosine|set theory|topology|group theory|fourier|tensor)\b/i },
]

export function extractConcepts(title, description = '', channelCfg) {
  const text = `${title} ${description}`
  const matched = []
  for (const rule of CONCEPT_RULES) {
    if (rule.re.test(text)) matched.push(rule)
  }
  if (!matched.length) {
    if (channelCfg.id === 'wonderblocks') matched.push(CONCEPT_RULES.find((r) => r.id === 'patterns-coding'))
    else if (channelCfg.id === 'alphablocks') matched.push(CONCEPT_RULES.find((r) => r.id === 'phonics-reading'))
    else if (channelCfg.id === 'colourblocks') matched.push(CONCEPT_RULES.find((r) => r.id === 'colours-sorting'))
    else if (channelCfg.group === 'symbols_bridge') matched.push(CONCEPT_RULES.find((r) => r.id === 'deep-math'))
    else matched.push(CONCEPT_RULES.find((r) => r.id === 'number-sense'))
  }
  const teaches = matched.slice(0, 3).map((m) => m.id)
  const needs = [...new Set(matched.flatMap((m) => m.needs))].filter((n) => !teaches.includes(n))
  return { concepts: teaches, needs }
}

export function inferStage(concepts, channelCfg, title) {
  if (channelCfg.group === 'symbols_bridge' || concepts.includes('deep-math')) return 'horizon'
  if (
    /\b(4th grade|5th grade|6th grade|pre-algebra|long division|percent|ratio|proportion|exponent|integer|coordinate|area and perimeter)\b/i.test(
      title,
    ) ||
    channelCfg.defaultStage === 'elementary'
  ) {
    return 'elementary'
  }
  if (
    concepts.some((c) => ['multiplication', 'division', 'fractions', 'place-value', 'measurement-time-money'].includes(c)) ||
    /\b(1st grade|2nd grade|3rd grade|primary school)\b/i.test(title)
  ) {
    return 'primary'
  }
  return channelCfg.defaultStage || 'preschool'
}

async function runYtDlp(targetUrl, limit) {
  const args = ['--flat-playlist', '--no-warnings', '-J']
  if (limit) args.push('--playlist-items', `1:${limit}`)
  args.push(targetUrl)
  try {
    const { stdout } = await execFileAsync(YTDLP, args, { maxBuffer: 64 * 1024 * 1024, timeout: 90_000 })
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
        byId.set(d.id, {
          id: d.id,
          title: d.title,
          channel: d.by,
          channelKey: 'symbols-dives',
          channelId: null,
          role: 'candidate',
          seedAnchor: null,
          group: 'symbols_bridge',
          duration: Math.max(60, segmentLen || d.len || 600),
          fullDuration: d.len,
          start: d.start,
          end: d.end,
          viewCount: 500_000,
          description: `Symbols Deep Dive (${rankLabel}${d.on ? ` — ${d.on}` : ''}). Stage: ${rInfo?.stageName ?? 'Mathematics'}.`,
          symbolsRanks: [rank],
          format: 'episode',
          stage: rank <= 11 ? 'elementary' : 'horizon',
          concepts: rank <= 4 ? ['addition', 'multiplication', 'fractions'] : rank <= 11 ? ['place-value', 'deep-math'] : ['deep-math'],
          needs: rank <= 6 ? ['counting'] : ['multiplication', 'fractions'],
        })
      } else {
        if (!prev.symbolsRanks.includes(rank)) prev.symbolsRanks.push(rank)
      }
    }
  }
  return [...byId.values()]
}

async function checkOembed(video) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${video.id}`)}&format=json`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const data = await res.json()
    return {
      ...video,
      title: video.title || data.title,
      channel: data.author_name || video.channel,
    }
  } catch {
    return null
  }
}

function normalizeTitleKey(title) {
  return title
    .toLowerCase()
    .replace(/\|.*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function main() {
  await fs.mkdir(CACHE_DIR, { recursive: true })

  const tasks = []
  for (const ch of CHANNELS) {
    for (const src of ch.sources) {
      tasks.push({ ch, src })
    }
  }

  console.log(`Harvesting ${tasks.length} channel/search sources across ${CHANNELS.length} channels...`)
  const rawBatches = await mapLimit(tasks, 6, async ({ ch, src }) => {
    const target = src.kind === 'tab' ? src.url : `ytsearch${src.limit}:${src.query}`
    const data = await runYtDlp(target, src.kind === 'tab' ? src.limit : undefined)
    const entries = Array.isArray(data.entries) ? data.entries : []
    const topChannel = data.channel || data.uploader || ch.name
    const topChannelId = data.channel_id || ch.channelId || null
    console.log(`  [${ch.id}] ${src.kind === 'tab' ? 'tab' : `"${src.query.slice(0, 42)}…"`} -> ${entries.length} entries`)
    return { ch, src, entries, topChannel, topChannelId }
  })

  const byId = new Map()
  const statsByChannel = new Map(CHANNELS.map((c) => [c.id, { raw: 0, keptPreOembed: 0, shortsDropped: 0, topicDropped: 0 }]))

  for (const { ch, src, entries, topChannel, topChannelId } of rawBatches) {
    const st = statsByChannel.get(ch.id)
    for (const e of entries) {
      if (!e || !e.id || e.id.length !== 11) continue
      st.raw++

      if (e.live_status === 'is_live' || e.live_status === 'is_upcoming') continue
      if (e.availability && e.availability !== 'public' && e.availability !== 'unlisted') continue

      // On search queries, strictly enforce channel ownership so third-party videos don't leak in
      const entryChId = e.channel_id || (src.kind === 'tab' ? topChannelId : null)
      const entryChName = e.channel || e.uploader || (src.kind === 'tab' ? topChannel : ch.name)
      if (src.kind === 'search') {
        if (ch.channelId && entryChId && entryChId !== ch.channelId) continue
        if (ch.channelId && !entryChId && !entryChName.toLowerCase().includes(ch.name.split('(')[0].trim().toLowerCase())) continue
        if (!ch.channelId && ch.expectedChannelMatch && !ch.expectedChannelMatch.test(entryChName)) continue
      }

      const duration = Number(e.duration) || 0
      // User rule: keep standalone videos AND compilations, exclude Shorts (<60s)
      if (duration > 0 && duration < 60) {
        st.shortsDropped++
        continue
      }
      if (duration === 0) continue

      const title = (e.title || '').trim()
      const description = (e.description || '').trim()
      if (!title || title === '[Private video]' || title === '[Deleted video]') continue

      if (!passesTopicFilter(ch.topicFilter, title, description)) {
        st.topicDropped++
        continue
      }

      if (byId.has(e.id)) {
        const existing = byId.get(e.id)
        if (!existing.description && description) existing.description = description
        continue
      }

      const { concepts, needs } = extractConcepts(title, description, ch)
      const format = duration >= 900 || COMPILATION_RE.test(title) ? 'compilation' : 'episode'
      const stage = inferStage(concepts, ch, title)

      byId.set(e.id, {
        id: e.id,
        title,
        channel: ch.id === 'pbs-kids-math' ? 'PBS KIDS' : ch.name,
        channelKey: ch.id,
        channelId: entryChId || ch.channelId || null,
        role: ch.role,
        seedAnchor: ch.seedAnchor || null,
        group: ch.group,
        duration,
        viewCount: Number(e.view_count) || 0,
        description,
        format,
        stage,
        concepts,
        needs,
      })
      st.keptPreOembed++
    }
  }

  // Merge in the 97 Symbols Deep Dives
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
  console.log(`Added ${symbolsAdded} distinct Symbols Deep Dive videos.`)

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
  console.log(`Pre-oEmbed unique videos after Shorts/promo/topic/title dedupe: ${candidates.length}`)

  // Verify oEmbed embeddability across all candidates concurrently
  console.log(`Verifying YouTube oEmbed embeddability across ${candidates.length} videos (24 workers)...`)
  const checked = await mapLimit(candidates, 24, checkOembed)
  const verified = checked.filter(Boolean)
  console.log(`Verified embeddable videos: ${verified.length} (${candidates.length - verified.length} non-embeddable/unavailable dropped)`)

  const outPath = path.join(CACHE_DIR, 'harvested.json')
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        harvestedAt: new Date().toISOString(),
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
