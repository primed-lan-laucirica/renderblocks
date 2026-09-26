import { CLOCKS, GROUP, GROUPS, PIC, PICTURES, RELATIONS, SEQUENCES, clearMembers, relatedTo, type Picture } from './pictures'
import { pcell, pick, sameCell, shuffle, tcell, type Cell, type Item, type SubtestId } from './types'
import { AURAL } from './aural'

/**
 * Picture subtests — the pictorial/verbal half of the batteries (OLSAT,
 * CogAT, WPPSI), built on the picture library (pictures.ts).
 *
 * Fairness is enforced, not hoped for: every item is checked so exactly one
 * choice is defensible, and arguable pictures (a group's `unsure` list) are
 * kept out of any item whose reasoning rests on that group.
 */

const choicesFor = (level: number) => (level <= 1 ? 3 : level <= 3 ? 4 : level <= 5 ? 5 : 6)
const cellOf = (p: Picture) => pcell(p.emoji)

function finish(
  sub: SubtestId,
  level: number,
  layout: Item['layout'],
  stimulus: Cell[],
  blankIndex: number,
  correct: Cell,
  distractors: Cell[],
  explain: string,
): Item {
  const opts: Cell[] = [correct]
  for (const d of distractors) {
    if (opts.length >= choicesFor(level)) break
    if (!opts.some((o) => sameCell(o, d))) opts.push(d)
  }
  const shuffled = shuffle(opts)
  return {
    sub,
    level,
    layout,
    stimulus,
    blankIndex,
    choices: shuffled,
    answer: shuffled.findIndex((c) => sameCell(c, correct)),
    explain,
  }
}

/* ---------- shared tags ---------- */

/**
 * Curated groups every picture belongs to — ignoring any where one of them
 * is arguable. Only curated groups count: a loose tag ("wild", "land") must
 * never decide an item, or the explanation ends up claiming something false.
 */
function commonTags(ps: Picture[]): string[] {
  if (!ps.length) return []
  return ps[0].tags.filter((t) => GROUP[t] && ps.every((p) => p.tags.includes(t) && !GROUP[t].unsure?.includes(p.id)))
}

const arguableIn = (p: Picture, tags: string[]) => tags.some((t) => GROUP[t]?.unsure?.includes(p.id))
const hasAll = (p: Picture, tags: string[]) => tags.every((t) => p.tags.includes(t))

/** The most specific named group among these tags — for the explanation. */
function labelFor(tags: string[]): string {
  const named = GROUPS.filter((g) => tags.includes(g.id)).sort((a, b) => b.level - a.level)
  return named[0]?.label ?? 'the same kind of thing'
}

/** Rule groups for a level: at it and just below — never trivially easy. */
function groupsFor(level: number) {
  const pool = GROUPS.filter((g) => g.level <= level && g.level >= level - 2 && clearMembers(g.id).length >= 4)
  return pool.length ? pool : GROUPS.filter((g) => g.level <= level)
}

/**
 * Distractors for a set that shares `common`. Low levels: things sharing
 * nothing with the set. Higher levels: near misses that share all but one
 * of its tags (a bat among birds, a spider among insects) — the gifted-level
 * trap of judging by appearance.
 */
function lures(common: string[], exclude: Set<string>, level: number, n: number): Picture[] {
  const pool = PICTURES.filter((p) => !exclude.has(p.id) && !hasAll(p, common) && !arguableIn(p, common))
  const shared = (p: Picture) => common.filter((t) => p.tags.includes(t)).length
  const near = pool.filter((p) => shared(p) >= Math.max(1, common.length - 1))
  const far = pool.filter((p) => shared(p) === 0)
  const nearShare = level <= 2 ? 0 : level <= 4 ? 0.5 : 0.8
  const out: Picture[] = []
  for (const p of shuffle(near)) if (out.length < Math.round(n * nearShare)) out.push(p)
  for (const p of shuffle(far.length ? far : pool)) if (out.length < n && !out.includes(p)) out.push(p)
  return out
}

/* ---------- Picture Classification: which one goes with these? ---------- */

function pictureClassify(level: number): Item {
  for (let tries = 0; tries < 50; tries++) {
    const g = pick(groupsFor(level))
    const members = shuffle(clearMembers(g.id))
    const stim = members.slice(0, 3)
    const common = commonTags(stim)
    const answer = members.slice(3).find((p) => hasAll(p, common) && !arguableIn(p, common))
    if (!answer) continue
    const exclude = new Set([...stim, answer].map((p) => p.id))
    const ds = lures(common, exclude, level, choicesFor(level) - 1)
    if (ds.length < choicesFor(level) - 1) continue
    return finish(
      'pictureClassify',
      level,
      'classify',
      stim.map(cellOf),
      -1,
      cellOf(answer),
      ds.map(cellOf),
      `They are all ${labelFor(common)}.`,
    )
  }
  throw new Error('pictureClassify: no fair item')
}

/* ---------- Odd One Out: which one does not belong? ---------- */

function oddOneOut(level: number): Item {
  const size = level <= 2 ? 3 : level <= 4 ? 4 : 5 // how many belong together
  for (let tries = 0; tries < 80; tries++) {
    const g = pick(groupsFor(level))
    const members = shuffle(clearMembers(g.id)).slice(0, size)
    if (members.length < size) continue
    const common = commonTags(members)
    const [odd] = lures(common, new Set(members.map((p) => p.id)), level, 1)
    if (!odd) continue
    // Exactly one odd one out: swapping any member for the odd picture must
    // not give a group that shuts out that member instead.
    const ambiguous = members.some((m) => {
      const others = [...members.filter((x) => x !== m), odd]
      const alt = commonTags(others)
      return alt.some((t) => !m.tags.includes(t))
    })
    if (ambiguous) continue
    const all = shuffle([...members, odd])
    return {
      sub: 'oddOneOut',
      level,
      layout: 'lone',
      stimulus: [],
      blankIndex: -1,
      choices: all.map(cellOf),
      answer: all.indexOf(odd),
      // Name the group the odd one is actually missing — not just the most specific one the rest share.
      explain: `The others are all ${labelFor(common.filter((t) => !odd.tags.includes(t)))} — the ${odd.name} is not.`,
    }
  }
  throw new Error('oddOneOut: no fair item')
}

/* ---------- Picture Analogies: A goes with B as C goes with ? ---------- */

function relationAnalogy(level: number): Item | null {
  const rels = RELATIONS.filter((r) => r.level <= level && r.level >= level - 2)
  const r = pick(rels.length ? rels : RELATIONS.filter((x) => x.level <= level))
  if (!r || r.pairs.length < 2) return null
  const [[a, b], [c, d]] = shuffle(r.pairs)
  const answers = new Set(r.pairs.filter(([x]) => x === c).map(([, y]) => y))
  // Anything of these kinds could arguably be an answer too — keep it out.
  const risky = (p: Picture) => p.tags.some((t) => r.avoid.includes(t) || PIC[d].tags.includes(t))
  const lure = [
    ...(r.lureFirst ? [PIC[b]] : []), // the first pair's answer — the classic trap, where fair
    ...relatedTo(c).map((id) => PIC[id]).filter((p) => p && !risky(p)), // related to C, but differently
  ]
  const filler = shuffle(PICTURES.filter((p) => !risky(p)))
  const ds = [...lure, ...filler].filter((p) => p && !answers.has(p.id) && p.id !== c && p.id !== a)
  return finish(
    'pictureAnalogy',
    level,
    'pairs',
    [cellOf(PIC[a]), cellOf(PIC[b]), cellOf(PIC[c]), tcell('?')],
    3,
    cellOf(PIC[d]),
    ds.map(cellOf),
    // In pictures, not names — no grammar to trip over, and he reads pictures and numbers best.
    `${PIC[a].emoji} ${r.verb} ${PIC[b].emoji}. ${PIC[c].emoji} ${r.verb} ${PIC[d].emoji}.`,
  )
}

/** Quantity analogies (ERB/CogAT style): the same change applied to a new picture. */
function countAnalogy(level: number): Item {
  const [x, y] = shuffle(PICTURES.filter((p) => p.tags.includes('fruit') || p.tags.includes('animal'))).slice(0, 2)
  const doubling = level >= 3 && Math.random() < 0.5
  const k = doubling ? 0 : pick(level <= 1 ? [1] : [1, 2])
  const n1 = pick([1, 2, 3])
  const n2 = pick([1, 2, 3].filter((n) => n !== n1))
  const f = (n: number) => (doubling ? n * 2 : n + k)
  const d = f(n2)
  const wrong = [f(n1), n2, d + 1, d - 1, d + 2].filter((n) => n >= 1 && n !== d)
  return finish(
    'pictureAnalogy',
    level,
    'pairs',
    [pcell(x.emoji, { count: n1 }), pcell(x.emoji, { count: f(n1) }), pcell(y.emoji, { count: n2 }), tcell('?')],
    3,
    pcell(y.emoji, { count: d }),
    [pcell(x.emoji, { count: d }), ...wrong.map((n) => pcell(y.emoji, { count: n }))],
    doubling ? 'Each one doubles.' : `Each one gets ${k} more.`,
  )
}

/** Size analogies: big → small, applied to something new. */
function sizeAnalogy(level: number): Item {
  const [x, y] = shuffle(PICTURES.filter((p) => p.tags.includes('animal') || p.tags.includes('vehicle'))).slice(0, 2)
  const growing = Math.random() < 0.5
  const [s0, s1] = growing ? [0.45, 1] : [1, 0.45]
  return finish(
    'pictureAnalogy',
    level,
    'pairs',
    [pcell(x.emoji, { scale: s0 }), pcell(x.emoji, { scale: s1 }), pcell(y.emoji, { scale: s0 }), tcell('?')],
    3,
    pcell(y.emoji, { scale: s1 }),
    [pcell(y.emoji, { scale: s0 }), pcell(x.emoji, { scale: s1 }), pcell(y.emoji, { scale: 0.72 }), pcell(y.emoji, { scale: s1, rotation: 180 })],
    growing ? 'Small turns big.' : 'Big turns small.',
  )
}

function pictureAnalogy(level: number): Item {
  const roll = Math.random()
  if (level <= 2 && roll < 0.35) return roll < 0.2 ? countAnalogy(level) : sizeAnalogy(level)
  if (level <= 4 && roll < 0.2) return countAnalogy(level)
  return relationAnalogy(level) ?? countAnalogy(level)
}

/* ---------- Picture Series: what comes next? ---------- */

function seriesItem(level: number, steps: Cell[], answer: Cell, distractors: Cell[], explain: string): Item {
  return finish('pictureSeries', level, 'row', [...steps, tcell('?')], steps.length, answer, distractors, explain)
}

function pictureSeries(level: number): Item {
  const kinds: Array<() => Item> = []
  const emoji = () => pick(PICTURES.filter((p) => p.tags.includes('fruit') || p.tags.includes('animal'))).emoji

  // Counting up (1 2 3 →4), by twos, down, doubling.
  kinds.push(() => {
    const e = emoji()
    const step = level <= 1 ? 1 : level <= 3 ? pick([1, 2]) : pick([2, -1])
    const start = step < 0 ? 5 : 1
    const seq = [0, 1, 2].map((i) => start + i * step)
    const next = start + 3 * step
    return seriesItem(
      level,
      seq.map((n) => pcell(e, { count: n })),
      pcell(e, { count: next }),
      [next + 1, next - 1, seq[2], next + 2].filter((n) => n >= 1 && n !== next).map((n) => pcell(e, { count: n })),
      step > 0 ? `${step === 1 ? 'One' : 'Two'} more each time.` : 'One fewer each time.',
    )
  })
  // Growing (or shrinking) in size.
  kinds.push(() => {
    const e = emoji()
    const sizes = [0.4, 0.6, 0.8, 1]
    const down = level >= 3 && Math.random() < 0.5
    const seq = down ? [...sizes].reverse() : sizes
    return seriesItem(
      level,
      seq.slice(0, 3).map((s) => pcell(e, { scale: s })),
      pcell(e, { scale: seq[3] }),
      [seq[1], seq[2], seq[0]].map((s) => pcell(e, { scale: s })),
      down ? 'Smaller each time.' : 'Bigger each time.',
    )
  })
  // Repeating patterns: AB, then AAB/ABB, then ABC.
  kinds.push(() => {
    const [a, b, c] = shuffle(PICTURES.filter((p) => p.tags.includes('fruit') || p.tags.includes('vehicle') || p.tags.includes('ball'))).slice(0, 3)
    const unit = level <= 1 ? [a, b] : level <= 3 ? pick([[a, a, b], [a, b, b]]) : [a, b, c]
    const len = unit.length * 2 + (level >= 4 ? 1 : 0)
    const full = Array.from({ length: len + 1 }, (_, i) => unit[i % unit.length])
    const next = full[len]
    return seriesItem(
      level,
      full.slice(0, len).map(cellOf),
      cellOf(next),
      [a, b, c].filter((p) => p !== next).map(cellOf),
      `The pattern repeats: ${unit.map((p) => p.emoji).join(' ')}.`,
    )
  })
  if (level >= 1) {
    // Things that grow or change in order (life cycles, the moon).
    kinds.push(() => {
      const seqs = SEQUENCES.filter((s) => s.level <= level)
      const s = pick(seqs)
      const shown = s.steps.slice(0, s.steps.length - 1)
      const next = s.steps[s.steps.length - 1]
      const others = shuffle(SEQUENCES.flatMap((q) => q.steps).filter((e) => e !== next))
      return seriesItem(level, shown.map((e) => pcell(e)), pcell(next), [...shown.slice(0, -1).reverse(), ...others].map((e) => pcell(e)), s.label)
    })
  }
  if (level >= 3) {
    // Clocks: an hour (or two, or backwards) at a time — number sense in a picture.
    kinds.push(() => {
      const step = level <= 3 ? 1 : level <= 4 ? 2 : pick([3, -2])
      const start = Math.floor(Math.random() * 12)
      const at = (i: number) => CLOCKS[(((start + i * step) % 12) + 12) % 12]
      const shown = [0, 1, 2].map(at)
      const next = at(3)
      const near = [at(4), at(2), CLOCKS[(((start + 3 * step + 1) % 12) + 12) % 12], CLOCKS[(((start + 3 * step - 1) % 12) + 12) % 12]]
      const hours = Math.abs(step)
      return seriesItem(
        level,
        shown.map((e) => pcell(e)),
        pcell(next),
        near.map((e) => pcell(e)),
        `The clock moves ${step < 0 ? 'back' : 'on'} ${hours} hour${hours > 1 ? 's' : ''} each time.`,
      )
    })
    // Turning: a quarter turn each time.
    kinds.push(() => {
      const e = pick(['🐟', '🐌', '🚗', '🐢', '✈️'])
      const turn = pick([90, -90])
      const seq = [0, 1, 2].map((i) => pcell(e, { rotation: i * turn }))
      const next = 3 * turn
      return seriesItem(
        level,
        seq,
        pcell(e, { rotation: next }),
        [0, turn, 2 * turn].map((r) => pcell(e, { rotation: r })),
        'It turns a quarter turn each time.',
      )
    })
  }
  if (level >= 5) {
    // Two things change at once: the picture alternates AND the count grows.
    kinds.push(() => {
      const [a, b] = shuffle(PICTURES.filter((p) => p.tags.includes('fruit'))).slice(0, 2)
      const seq = [0, 1, 2, 3].map((i) => pcell(i % 2 ? b.emoji : a.emoji, { count: i + 1 }))
      return seriesItem(
        level,
        seq,
        pcell(a.emoji, { count: 5 }),
        [pcell(b.emoji, { count: 5 }), pcell(a.emoji, { count: 4 }), pcell(b.emoji, { count: 4 }), pcell(a.emoji, { count: 6 })],
        'The picture takes turns and there is one more each time.',
      )
    })
  }
  return pick(kinds)()
}

/* ---------- Picture Memory: look, then find them ---------- */

function pictureMemory(level: number): Item {
  const n = [2, 3, 3, 4, 5, 6][level - 1]
  const gridSize = n <= 3 ? 6 : n <= 5 ? 9 : 12
  // Higher levels draw the extras from the SAME kinds of things — much harder to keep apart.
  const big = GROUPS.filter((x) => clearMembers(x.id).length >= gridSize)
  const g = level >= 3 && big.length ? pick(big) : null
  const pool = shuffle(g ? clearMembers(g.id) : PICTURES.filter((p) => p.tags.length))
  const study = pool.slice(0, n)
  const extras = pool.slice(n, gridSize)
  const grid = shuffle([...study, ...extras])
  return {
    sub: 'pictureMemory',
    level,
    layout: 'touchGrid',
    stimulus: grid.map(cellOf),
    blankIndex: -1,
    choices: [],
    answer: -1,
    explain: `You saw: ${study.map((p) => p.emoji).join(' ')}`,
    touch: { targets: study.map((p) => grid.indexOf(p)), ordered: false, text: 'Find the pictures you saw.' },
    memory: { study: study.map(cellOf), ms: 2500 + 700 * n },
  }
}

/* ---------- Aural Reasoning: a spoken question, answered with a picture ---------- */

function auralReasoning(level: number): Item {
  const floor = Math.max(1, level - 1)
  const pool = AURAL.filter((q) => q.level <= level && q.level >= floor)
  const q = pick(pool.length ? pool : AURAL.filter((x) => x.level <= level))
  const cells = [q.answer, ...q.wrong]
  const shuffled = shuffle(cells)
  return {
    sub: 'auralReasoning',
    level,
    layout: 'lone',
    stimulus: [],
    blankIndex: -1,
    choices: shuffled,
    answer: shuffled.findIndex((c) => sameCell(c, q.answer)),
    explain: q.explain,
    speak: { clip: q.id, text: q.text },
  }
}

export function generatePicture(sub: SubtestId, level: number): Item | null {
  switch (sub) {
    case 'pictureClassify':
      return pictureClassify(level)
    case 'oddOneOut':
      return oddOneOut(level)
    case 'pictureAnalogy':
      return pictureAnalogy(level)
    case 'pictureSeries':
      return pictureSeries(level)
    case 'pictureMemory':
      return pictureMemory(level)
    case 'auralReasoning':
      return auralReasoning(level)
    default:
      return null
  }
}

