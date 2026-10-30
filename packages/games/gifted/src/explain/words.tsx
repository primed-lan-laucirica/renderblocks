 
/** The Pictures & Words island's explainers. */
import { explainer } from './define'
import { BLUE, GREEN_, PURPLE, Q, RED, YELLOW, pic, shape } from './cells'

const each = (cells: number[], from: number, to: number, until?: number, choice = false) =>
  cells.map((c, i) => ({ cells: [c], from: from + (i * (to - from)) / cells.length, to: until, choice }))

export const pictureClassify = explainer(
  'pictureClassify',
  'Picture Classification',
  ['Look at these three pictures.', 'A shirt, pants, and shoes.', 'How are they the same?', 'They are all clothes.', 'Which one is clothes too?', 'Not the bear. Not the fox.', 'The glove! A glove is clothes too.', { say: 'Now you try.', pause: 0.3 }],
  (L) => ({
    puzzle: { layout: 'classify', stimulus: [pic('👕'), pic('👖'), pic('👟')], blankIndex: -1, choices: [pic('🐻'), pic('🧤'), pic('🦊')], answer: 1 },
    appear: L[0].time + 0.2,
    step: 0.45,
    marks: [...each([0, 1, 2], L[1].time, L[1].end, L[2].end), { cells: [0, 1, 2], from: L[3].time }],
    note: { text: 'clothes', from: L[3].time },
    choices: L[4].time,
    ruleOut: [
      { choice: 0, at: L[5].time + 0.1 },
      { choice: 2, at: (L[5].time + L[5].end) / 2 },
    ],
    answer: [L[6].time + 0.3, L[6].time + 1.3],
  }),
)

export const pictureAnalogy = explainer(
  'pictureAnalogy',
  'Picture Analogies',
  ['A monkey eats a banana.', 'A bird eats something too.', 'Which one does a bird eat?', 'Not a wrench. Not a house.', 'A bird eats a worm!', { say: 'Now you try.', pause: 0.3 }],
  (L) => ({
    puzzle: { layout: 'pairs', stimulus: [pic('🐒'), pic('🍌'), pic('🐦'), Q], blankIndex: 3, choices: [pic('🔧'), pic('🪱'), pic('🏠')], answer: 1 },
    appear: 0.2,
    step: 0.3,
    marks: [
      { cells: [0, 1], from: L[0].time, to: L[1].time },
      { cells: [2, 3], from: L[1].time },
    ],
    note: { text: 'eats', from: L[0].time + 0.4 },
    choices: L[2].time,
    ruleOut: [
      { choice: 0, at: L[3].time + 0.1 },
      { choice: 2, at: (L[3].time + L[3].end) / 2 },
    ],
    answer: [L[4].time + 0.2, L[4].time + 1.2],
  }),
)

export const pictureSeries = explainer(
  'pictureSeries',
  'Picture Series',
  ['Look at the apples.', 'One apple. Two apples. Three apples.', 'One more each time.', 'So what comes next?', 'Four apples!', { say: 'Now you try.', pause: 0.3 }],
  (L) => ({
    puzzle: { layout: 'row', stimulus: [pic('🍎', 1), pic('🍎', 2), pic('🍎', 3), Q], blankIndex: 3, choices: [pic('🍎', 3), pic('🍎', 4), pic('🍎', 5)], answer: 1 },
    appear: L[0].time + 0.2,
    marks: each([0, 1, 2], L[1].time, L[1].end, L[3].time),
    note: { text: 'one more each time', from: L[2].time },
    choices: L[3].time,
    answer: [L[4].time + 0.1, L[4].time + 1.1],
  }),
)

export const oddOneOut = explainer(
  'oddOneOut',
  'Odd One Out',
  ['Look at these four pictures.', 'An apple, a banana, a car, and grapes.', 'Three of them are fruit.', 'The car is not a fruit.', 'So the car does not belong.', { say: 'Now you try.', pause: 0.3 }],
  (L) => ({
    puzzle: { layout: 'lone', stimulus: [], blankIndex: -1, choices: [pic('🍎'), pic('🍌'), pic('🚗'), pic('🍇')], answer: 2 },
    appear: 0.3,
    choices: L[0].time,
    choiceTimes: [0, 1, 2, 3].map((i) => L[0].time + 0.2 + i * 0.3),
    marks: [...each([0, 1, 2, 3], L[1].time, L[1].end, L[2].time, true), ...[0, 1, 3].map((c) => ({ cells: [c], from: L[2].time + 0.3, to: L[3].time, choice: true, colour: GREEN_ })), { cells: [2], from: L[3].time, to: L[4].time + 0.2, choice: true, colour: RED }],
    note: { text: 'not a fruit', from: L[3].time + 0.3 },
    answer: [L[4].time + 0.3, L[4].time + 1.3],
  }),
)

export const auralReasoning = explainer(
  'auralReasoning',
  'Aural Reasoning',
  ['Listen to the question.', 'Which one can you eat for breakfast?', "You can't eat a teddy bear, a hammer, or a shoe.", 'You can eat pancakes!', { say: 'Now you try.', pause: 0.3 }],
  (L) => ({
    puzzle: { layout: 'lone', stimulus: [], blankIndex: -1, choices: [pic('🥞'), pic('🧸'), pic('🔨'), pic('👟')], answer: 0, speak: { clip: '', text: '' } },
    appear: 0.3,
    choices: 0.5,
    ruleOut: [1, 2, 3].map((c, i) => ({ choice: c, at: L[2].time + 0.6 + i * ((L[2].end - L[2].time - 0.6) / 3) })),
    answer: [L[3].time + 0.3, L[3].time + 1.3],
  }),
)

export const pictureMemory = explainer(
  'pictureMemory',
  'Picture Memory',
  ['Look at these two pictures.', 'A lion and a paintbrush.', 'Remember them!', 'Now they are hiding with other pictures.', 'Find the ones you saw.', 'The lion!', 'The paintbrush!', { say: 'Now you try.', pause: 0.3 }],
  (L) => ({
    puzzle: { layout: 'touchGrid', stimulus: [pic('🖌️'), pic('🦁'), pic('✂️'), pic('🐔'), pic('👮'), pic('🌷')], blankIndex: -1, choices: [], answer: -1, touch: { targets: [1, 0], ordered: false, text: '' } },
    memory: { cells: [pic('🦁'), pic('🖌️')], from: 0.4, to: L[2].end + 0.6 },
    appear: L[2].end + 0.7,
    step: 0.15,
    taps: [
      { cell: 1, at: L[5].time + 0.2 },
      { cell: 0, at: L[6].time + 0.2 },
    ],
  }),
)

// The real directions come from a fixed bank; at the start, two kinds: "both … and …", and "between the two …".
export const followDirections = explainer(
  'followDirections',
  'Following Directions',
  [
    'Listen carefully, then touch.',
    'Touch the shape that is both blue and round.',
    'The blue square is blue, but it is not round.',
    'The red circle is round, but it is not blue.',
    'The blue circle is both!',
    'Touch the shape between the two stars.',
    'This one!',
    { say: 'Now you try.', pause: 0.3 }
  ],
  (L) => ({
    puzzle: {
      layout: 'touchGrid',
      stimulus: [shape('star', YELLOW), shape('hexagon', GREEN_), shape('star', PURPLE), shape('square', BLUE), shape('circle', RED), shape('circle', BLUE)],
      blankIndex: -1,
      choices: [],
      answer: -1,
      touch: { targets: [5], ordered: false, text: '', clip: '' },
    },
    appear: 0.2,
    step: 0.15,
    marks: [
      { cells: [3], from: L[2].time, to: L[3].time },
      { cells: [4], from: L[3].time, to: L[4].time },
      { cells: [0], from: L[5].end - 0.3, to: L[6].end },
      { cells: [2], from: L[5].end - 0.3, to: L[6].end },
    ],
    taps: [
      { cell: 5, at: L[4].time + 0.2 },
      { cell: 1, at: L[6].time + 0.1 },
    ],
  }),
)
