import { ncell, pcell, tcell, type Cell } from './types'

/**
 * Aural Reasoning (OLSAT Aural Reasoning & Arithmetic Reasoning; WPPSI
 * Information/Comprehension). The spoken question IS the item — heard, then
 * answered by dragging a picture, number or name. Each sentence has a
 * pre-generated clip in /games/gifted/aural/<id>.mp3 (tools/audio manifest).
 *
 * Written for this project; no test item is reproduced. Difficulty comes
 * from negation ("…but is not a bird"), inference, transitive order and
 * multi-step arithmetic — not from vocabulary.
 */
export interface AuralQuestion {
  id: string
  level: number
  text: string
  answer: Cell
  wrong: Cell[]
  explain: string
}

const p = (emoji: string, count?: number) => pcell(emoji, count ? { count } : {})

export const AURAL: AuralQuestion[] = [
  // L1 — function, habitat, simple story sums
  { id: 'a-cut-paper', level: 1, text: 'Which one do we use to cut paper?', answer: p('✂️'), wrong: [p('🥄'), p('🔑'), p('🖍️')], explain: 'Scissors cut paper.' },
  { id: 'a-ocean', level: 1, text: 'Which one lives in the ocean?', answer: p('🐙'), wrong: [p('🐄'), p('🐿️'), p('🦒')], explain: 'An octopus lives in the ocean.' },
  { id: 'a-rain', level: 1, text: 'It is raining outside. Which one will keep you dry?', answer: p('☂️'), wrong: [p('🕶️'), p('🧤'), p('🩳')], explain: 'An umbrella keeps the rain off.' },
  { id: 'a-breakfast', level: 1, text: 'Which one can you eat for breakfast?', answer: p('🥞'), wrong: [p('🧸'), p('👟'), p('🔨')], explain: 'Pancakes are a breakfast food.' },
  { id: 'a-apples-3', level: 1, text: 'Sam has two apples. Then he gets one more. Which picture shows how many apples Sam has now?', answer: p('🍎', 3), wrong: [p('🍎', 2), p('🍎', 4), p('🍎', 1)], explain: 'Two and one more make three.' },

  // L2
  { id: 'a-dark', level: 2, text: 'Which one would help you see in the dark?', answer: p('🔦'), wrong: [p('🕶️'), p('🔔'), p('🧦')], explain: 'A flashlight makes light.' },
  { id: 'a-wool', level: 2, text: 'Which animal gives us wool to make sweaters?', answer: p('🐑'), wrong: [p('🐄'), p('🐔'), p('🐖')], explain: 'Wool comes from sheep.' },
  { id: 'a-time', level: 2, text: 'Which one tells you what time it is?', answer: p('⏰'), wrong: [p('📏'), p('🧲'), p('🔑')], explain: 'A clock tells the time.' },
  { id: 'a-birds-left', level: 2, text: 'There are four birds on a branch. One flies away. Which picture shows how many birds are left?', answer: p('🐦', 3), wrong: [p('🐦', 4), p('🐦', 5), p('🐦', 2)], explain: 'Four take away one is three.' },
  { id: 'a-melt', level: 2, text: 'Which one would melt on a hot, sunny day?', answer: p('⛄'), wrong: [p('🪵'), p('🔑'), p('⚽')], explain: 'A snowman melts in the sun.' },

  // L3 — negation and inference
  { id: 'a-fly-not-bird', level: 3, text: 'Which one can fly, but is not a bird?', answer: p('🦋'), wrong: [p('🐧'), p('🦉'), p('🐟')], explain: 'A butterfly flies, but it is an insect.' },
  { id: 'a-seed', level: 3, text: 'Mia planted a seed and watered it every day. Which one shows what grew?', answer: p('🌷'), wrong: [p('🐣'), p('🍪'), p('🎈')], explain: 'A seed grows into a plant.' },
  { id: 'a-more-legs', level: 3, text: 'Which one has more legs than a dog?', answer: p('🕷️'), wrong: [p('🐔'), p('🐈'), p('🐍')], explain: 'A spider has eight legs; a dog has four.' },
  { id: 'a-cookies-left', level: 3, text: 'Ben had five cookies. He ate two of them. Which picture shows how many cookies Ben has left?', answer: p('🍪', 3), wrong: [p('🍪', 5), p('🍪', 2), p('🍪', 4)], explain: 'Five take away two is three.' },
  { id: 'a-firefighter', level: 3, text: 'Which one would a firefighter need?', answer: p('🧯'), wrong: [p('🩺'), p('🎨'), p('🍳')], explain: 'A fire extinguisher puts out fires.' },

  // L4
  { id: 'a-sea-not-fish', level: 4, text: 'Which animal lives in the ocean, but is not a fish?', answer: p('🐬'), wrong: [p('🦈'), p('🐠'), p('🐄')], explain: 'A dolphin lives in the ocean, but it is not a fish.' },
  { id: 'a-yellow-tree', level: 4, text: 'Which one is a yellow fruit that grows on a tree?', answer: p('🍋'), wrong: [p('🍎'), p('🌽'), p('🌻')], explain: 'A lemon is yellow and grows on a tree.' },
  { id: 'a-wheels-12', level: 4, text: 'There are three cars. Each car has four wheels. How many wheels are there in all?', answer: ncell(12), wrong: [ncell(7), ncell(3), ncell(16)], explain: 'Three fours make twelve.' },
  { id: 'a-opposite-hot', level: 4, text: 'Which one is the opposite of hot?', answer: p('🧊'), wrong: [p('🔥'), p('☀️'), p('☕')], explain: 'Ice is cold — the opposite of hot.' },
  { id: 'a-snow-wear', level: 4, text: 'Lily is going out to play in the snow. Which one should she wear?', answer: p('🧤'), wrong: [p('🩳'), p('🩴'), p('👒')], explain: 'Gloves keep hands warm in the snow.' },

  // L5 — classification traps, order, multiplication
  { id: 'a-not-insect', level: 5, text: 'Which one is not an insect, even though it is small and has many legs?', answer: p('🕷️'), wrong: [p('🐝'), p('🐜'), p('🦋')], explain: 'Insects have six legs. A spider has eight.' },
  { id: 'a-shortest', level: 5, text: 'Tom is taller than Ann. Ann is taller than Max. Who is the shortest?', answer: tcell('Max'), wrong: [tcell('Tom'), tcell('Ann')], explain: 'Tom is tallest, then Ann, then Max.' },
  { id: 'a-spider-legs', level: 5, text: 'A spider has eight legs. How many legs do two spiders have?', answer: ncell(16), wrong: [ncell(10), ncell(8), ncell(18)], explain: 'Eight and eight make sixteen.' },
  { id: 'a-smaller', level: 5, text: 'Which one gets smaller the longer you use it?', answer: p('🕯️'), wrong: [p('💡'), p('🔦'), p('⌚')], explain: 'A candle melts down as it burns.' },
  { id: 'a-eggs-left', level: 5, text: 'The farmer had six eggs. Three hatched into chicks. How many eggs did not hatch?', answer: ncell(3), wrong: [ncell(6), ncell(9), ncell(2)], explain: 'Six take away three is three.' },

  // L6
  { id: 'a-flying-mammal', level: 6, text: 'Which one is a mammal, even though it can fly?', answer: p('🦇'), wrong: [p('🦅'), p('🦋'), p('✈️')], explain: 'A bat is a mammal that flies.' },
  { id: 'a-yesterday', level: 6, text: 'If today is Monday, what day was it yesterday?', answer: tcell('Sunday'), wrong: [tcell('Tuesday'), tcell('Friday'), tcell('Saturday')], explain: 'The day before Monday is Sunday.' },
  { id: 'a-empty-seats', level: 6, text: 'A bus has twelve seats. Nine people are sitting down. How many seats are empty?', answer: ncell(3), wrong: [ncell(21), ncell(9), ncell(4)], explain: 'Twelve take away nine is three.' },
  { id: 'a-sink', level: 6, text: 'Which one would sink if you put it in water?', answer: p('🔑'), wrong: [p('🦆'), p('⛵'), p('🪵')], explain: 'A metal key sinks; wood, boats and ducks float.' },
  { id: 'a-bags-apples', level: 6, text: 'Ann has three bags. Each bag has two apples. She eats one apple. How many apples are left?', answer: ncell(5), wrong: [ncell(6), ncell(4), ncell(7)], explain: 'Three twos make six; eat one and five are left.' },
]
