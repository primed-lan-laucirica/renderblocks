/**
 * The core concepts the Progress tile follows, each tied to the Common Core
 * standards it's evidence for (codes as in the Learning Commons Knowledge
 * Graph, CC BY 4.0) and to the apps that record answers for it.
 *
 * A "facts" concept has a fixed set of items laid out as a grid (the times
 * table is 12 × 12), so it can say how many of them are secure. A "count"
 * concept just counts what he's got right.
 */

export interface Grid {
  /** Row keys (the drill's tables), in order. */
  rows: number[]
  cols: number
  /** The item for a cell, exactly as its app records it (e.g. '7×8'). */
  item: (row: number, col: number) => string
  /** What the cell shows: the answer. */
  answer: (row: number, col: number) => number
  /** Row and column headings. */
  rowLabel: (row: number) => string
  colLabel: (row: number, col: number) => string
  /** For speaking a cell: a, op, b, answer. */
  say: (row: number, col: number) => [number, string, number, number]
}

interface Base {
  id: string
  title: string
  /** The Common Core codes its answers are recorded under. */
  codes: string[]
  /** Apps that feed it (kernel ids). */
  apps: string[]
  colour: string
}
export interface FactsConcept extends Base {
  kind: 'facts'
  grid: Grid
  /** What one row is called in milestones ("the 7 times table"). */
  rowName: (row: number) => string
}
export interface CountConcept extends Base {
  kind: 'count'
  /** What's being counted ("points found"). */
  unit: string
  /** Groups for its bar graph, from an item. */
  group?: { labels: string[]; of: (item: string) => number }
}
export type Concept = FactsConcept | CountConcept

const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i)

/** The quadrant of '(x, y)', 0–3 (I–IV); points on an axis go with the quadrant they border anticlockwise. */
export function quadrant(item: string): number {
  const m = /\((-?\d+),\s*(-?\d+)\)/.exec(item)
  if (!m) return 0
  const x = Number(m[1])
  const y = Number(m[2])
  if (x >= 0 && y >= 0) return 0
  if (x < 0 && y >= 0) return 1
  if (x < 0) return 2
  return 3
}

export const CONCEPTS: Concept[] = [
  {
    id: 'add',
    title: 'Adding',
    codes: ['2.OA.B.2'],
    apps: ['add'],
    colour: '#FF8C00',
    kind: 'facts',
    grid: {
      rows: range(0, 10),
      cols: 10,
      item: (a, i) => `${a}+${i}`,
      answer: (a, i) => a + i,
      rowLabel: (a) => `${a} +`,
      colLabel: (_, i) => String(i),
      say: (a, i) => [a, '+', i, a + i],
    },
    rowName: (a) => `${a} plus`,
  },
  {
    id: 'subtract',
    title: 'Taking away',
    codes: ['2.OA.B.2'],
    apps: ['subtract'],
    colour: '#00BCD4',
    kind: 'facts',
    grid: {
      rows: range(0, 10),
      cols: 10,
      item: (b, i) => `${b + i}−${b}`,
      answer: (_, i) => i,
      rowLabel: (b) => `− ${b}`,
      colLabel: (b, i) => String(b + i),
      say: (b, i) => [b + i, '−', b, i],
    },
    rowName: (b) => `take away ${b}`,
  },
  {
    id: 'times',
    title: 'Times tables',
    codes: ['3.OA.C.7'],
    apps: ['times'],
    colour: '#16A34A',
    kind: 'facts',
    grid: {
      rows: range(1, 12),
      cols: 12,
      item: (a, i) => `${a}×${i + 1}`,
      answer: (a, i) => a * (i + 1),
      rowLabel: (a) => `${a} ×`,
      colLabel: (_, i) => String(i + 1),
      say: (a, i) => [a, '×', i + 1, a * (i + 1)],
    },
    rowName: (a) => `${a} times table`,
  },
  {
    id: 'divide',
    title: 'Dividing',
    codes: ['3.OA.C.7'],
    apps: ['divide'],
    colour: '#E91E63',
    kind: 'facts',
    grid: {
      rows: range(1, 12),
      cols: 12,
      item: (b, i) => `${b * (i + 1)}÷${b}`,
      answer: (_, i) => i + 1,
      rowLabel: (b) => `÷ ${b}`,
      colLabel: (b, i) => String(b * (i + 1)),
      say: (b, i) => [b * (i + 1), '÷', b, i + 1],
    },
    rowName: (b) => `divide by ${b}`,
  },
  {
    id: 'plane',
    title: 'Coordinate plane',
    codes: ['5.G.A.1', '6.NS.C.8'],
    apps: ['graph'],
    colour: '#009688',
    kind: 'count',
    unit: 'points found',
    group: { labels: ['I', 'II', 'III', 'IV'], of: quadrant },
  },
  {
    id: 'sort',
    title: 'Sorting into groups',
    codes: ['K.MD.B.3'],
    apps: ['sort'],
    colour: '#0EA5E9',
    kind: 'count',
    unit: 'decks sorted right',
  },
]
