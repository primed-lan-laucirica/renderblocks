/**
 * Rank 30, union, intersection and difference: new sets made from two.
 * The signs on the paper are those of ranks 1–6, letters (rank 12), ∧ and
 * ∨ (rank 23), ∈ (rank 26), the set brackets (rank 27), ∅ (rank 28) and
 * the three themselves. ∩ keeps what is in both sets, ∪ gathers what is in
 * either, and ∖ takes one set's elements away from the other's. The round
 * signs are the pointed ones of rank 23 made for sets: intersection is
 * built from "and", union from "or". Where they are used: what two sets
 * share (the multiples of two and of three), and sets that share nothing.
 *
 * No names or dates are narrated.
 */
import type { Pt } from '@renderblocks/scene/ease'
import type { Spec } from '../engine/spec'
import type { Tok } from '../kit/glyphs'
import { member, venn, vennAt, type Venn } from '../kit/logic'
import { line, type Sprite } from '../kit/sprites'

/** The two sets, written out: large at first, then small along the top. */
const SET_A = ['A', '=', '{', '1', ',', '2', ',', '3', ',', '4', '}']
const SET_B = ['B', '=', '{', '3', ',', '4', ',', '5', ',', '6', '}']

/** The same two sets as loops that overlap, under the line being read. */
const V: Venn = { x: 960, y: 620, r: 290, d: 180 }
type Part = 'a' | 'both' | 'b'
const two = (part: Part, toks: [string, string], gold = false): Sprite[] => toks.map((g, i) => member(`${part}${i}`, g, { x: vennAt(V, part).x, y: V.y + (i ? 95 : -95) }, { size: 100, gold }))
/** Their members; `gold` lights the parts being spoken of. */
const members = (gold: Part[] = []): Sprite[] => [...two('a', ['1', '2'], gold.includes('a')), ...two('both', ['3', '4'], gold.includes('both')), ...two('b', ['5', '6'], gold.includes('b'))]
const loops = (shade: { a?: number; both?: number; b?: number } = {}) => venn('v', V, { names: ['A', 'B'], shade })
/** The line over the loops. */
const over = (toks: Tok[], gold: string[] = [], size = 140) => line(toks, { y: 170, size, gold })

/** The multiples of two and of three, up to twelve. */
const TWOS: Pt[] = [
  { x: 700, y: 480 },
  { x: 620, y: 620 },
  { x: 700, y: 760 },
  { x: 780, y: 620 },
]
const multiples = (): Sprite[] => [
  ...['2', '4', '8', '10'].map((g, i) => member(`a${i}`, g, TWOS[i], { size: 90 })),
  ...['6', '12'].map((g, i) => member(`both${i}`, g, { x: V.x, y: V.y + (i ? 90 : -90) }, { size: 90, gold: true })),
  ...['3', '9'].map((g, i) => member(`b${i}`, g, { x: 1230, y: V.y + (i ? 90 : -90) }, { size: 90 })),
]

export const r30: Spec = {
  rank: 30,
  id: 'r30',
  title: 'Union and intersection',
  steps: [
    // ── 1. The need ──
    {
      act: 1,
      stage: { a: line(SET_A, { y: 330, size: 170 }), b: line(SET_B, { y: 600, size: 170 }) },
      say: 'Here are two sets, A and B. Which numbers are in both of them?',
      turn: { kind: 'predict', id: 'both', prompt: 'Which numbers are in both sets?', options: [{ label: 'Three and four' }, { label: 'One and six' }] },
    },
    {
      stage: { a: line(SET_A, { x: 480, y: 170, size: 110 }), b: line(SET_B, { x: 1440, y: 170, size: 110 }), sets: loops({ both: 1 }), in: members(['both']) },
      say: 'Three and four. Drawn as loops, they sit where the two loops overlap.',
    },
    {
      stage: { a: null, b: null, line: over(['A', '?', 'B'], ['?'], 150), sets: loops(), in: members() },
      say: 'How do we write the part in both? And everything in either?',
    },

    // ── 2. What the signs do ──
    {
      act: 2,
      stage: { line: over(['A', '∩', 'B', '=', '{', '3', ',', '4', '}'], ['∩']), sets: loops({ both: 1 }), in: members(['both']) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This sign says: intersection. A intersection B is everything that is in A and in B.',
    },
    {
      stage: { line: over(['A', '∪', 'B', '=', '{', '1', ',', '2', ',', '3', ',', '4', ',', '5', ',', '6', '}'], ['∪'], 130), sets: loops({ a: 1, both: 1, b: 1 }), in: members() },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'This one says: union. A union B is everything in A or in B, or in both. Three and four are listed only once.',
      poster: true,
    },
    {
      stage: { line: over(['A', '∖', 'B', '=', '{', '1', ',', '2', '}'], ['∖']), sets: loops({ a: 1 }), in: members(['a']) },
      move: 1.1,
      quiet: 1.2,
      motif: true,
      say: 'And this sign says: without. A without B is everything in A that is not in B.',
    },
    {
      stage: { line: over(['B', '∖', 'A', '=', '{', '5', ',', '6', '}']), sets: loops({ b: 1 }), in: members(['b']) },
      say: 'Turn it round, and the answer changes. B without A is five and six.',
    },
    {
      clear: true,
      stage: {
        meet: line(['A', '∩', 'B', '=', '{', 'x', '∣', 'x', '∈', 'A', '∧', 'x', '∈', 'B', '}'], { y: 360, size: 110, gold: ['∩', '∧'] }),
        join: line(['A', '∪', 'B', '=', '{', 'x', '∣', 'x', '∈', 'A', '∨', 'x', '∈', 'B', '}'], { y: 660, size: 110, gold: ['∪', '∨'] }),
      },
      say: 'Look at the shapes. The sign for intersection is the sign for and, made round. The sign for union is the sign for or, made round.',
    },

    // ── 3. Where they are used ──
    {
      act: 3,
      clear: true,
      stage: { line: over(['A', '∩', 'B', '=', '{', '6', ',', '12', '}']), sets: loops({ both: 1 }), in: multiples() },
      say: 'Intersection finds what two sets share. Here A is the multiples of two, up to twelve, and B the multiples of three. Six and twelve are in both.',
    },
    {
      clear: true,
      stage: {
        a: line(['A', '=', '{', '2', ',', '4', ',', '6', ',', '…', '}'], { x: 480, y: 190, size: 110 }),
        b: line(['B', '=', '{', '1', ',', '3', ',', '5', ',', '…', '}'], { x: 1440, y: 190, size: 110 }),
        line: line(['A', '∩', 'B', '=', '∅'], { y: 480, size: 170 }),
      },
      say: 'Now A is every even number, and B every odd number. They share nothing, so their intersection is the empty set.',
    },
    {
      stage: { join: line(['A', '∪', 'B', '=', '{', '1', ',', '2', ',', '3', ',', '…', '}'], { y: 780, size: 170 }) },
      say: 'And their union is every counting number.',
    },

    // ── 4. His turn ──
    {
      act: 4,
      clear: true,
      stage: { a: line(['A', '=', '{', '1', ',', '2', '}'], { x: 520, y: 220, size: 120 }), b: line(['B', '=', '{', '2', ',', '3', '}'], { x: 1400, y: 220, size: 120 }) },
      say: 'Here are two new sets. Which one is true?',
      turn: { kind: 'choose', id: 'share', prompt: 'Which one is true?', cards: [['A', '∩', 'B', '=', '{', '2', '}'], ['A', '∪', 'B', '=', '{', '2', '}']], right: 0 },
    },
    {
      clear: true,
      say: 'Put in the sign that makes this line true.',
      turn: { kind: 'place', id: 'join', prompt: 'Which sign makes it true?', toks: ['{', '1', ',', '2', '}', '_', '{', '2', ',', '3', '}', '=', '{', '1', ',', '2', ',', '3', '}'], tiles: ['∪', '∩'], right: '∪', size: 110 },
    },
    { clear: true, say: 'Now you read one.', pad: 0.2 },
    { stage: { line: line(['A', '∩', 'B', '=', '∅'], { y: 480, size: 200 }) }, move: 0.6, say: 'A intersection B is the empty set.', turn: { kind: 'read', id: 'readempty', prompt: 'You read it.' } },
    {
      clear: true,
      teaser: true,
      stage: { line: line(['{', '1', ',', '2', ',', '3', ',', '…', '}'], { y: 380, size: 210 }) },
      say: 'The counting numbers go on for ever.',
    },
    { teaser: true, stage: { ask: line(['?'], { y: 720, size: 230, gold: ['?'] }) }, say: 'A set used this much has a sign of its own. What is it?', pad: 1 },
  ],
}
