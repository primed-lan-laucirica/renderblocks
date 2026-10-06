/**
 * The sorting decks (Drive: Sorting/Sorting-research.md). Every deck is a
 * hand-picked list, card by card, so each card has exactly one right bin —
 * the fairness rule from Gifted: anything a reasonable person could put in
 * two bins (is a tomato a fruit? does a helicopter have wheels? is a duck a
 * farm animal?) is left out rather than marked wrong.
 *
 * A card is "emoji name". Pictures are standard emoji (Unicode ≤ 13), drawn
 * by the tablet's own emoji font, as in Gifted.
 */

export interface Card {
  emoji: string
  name: string
}

export interface Bin {
  /** The bin's name, a short word or two. */
  label: string
  /** A picture on the bin showing what goes in it (never one of the cards dealt). */
  example: string
}

export interface Deck {
  id: string
  title: string
  section: Section
  bins: Bin[]
  /** Each card with the bin it goes in. */
  cards: { card: Card; bin: number }[]
  /** A switch deck: the same cards sorted again by a second rule (their bins in `then.bins`). */
  then?: { bins: Bin[]; bin: Map<string, number> }
}

export type Section = 'Kinds' | 'People' | 'Where it goes' | 'What it is' | 'Switch'
export const SECTIONS: Section[] = ['Kinds', 'People', 'Where it goes', 'What it is', 'Switch']

const parse = (list: string): Card[] =>
  list
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf(' ')
      return { emoji: s.slice(0, i), name: s.slice(i + 1) }
    })

/** A deck from its bins: [label, example, "emoji name, emoji name, …"]. */
function deck(id: string, title: string, section: Section, bins: [string, string, string][]): Deck {
  return {
    id,
    title,
    section,
    bins: bins.map(([label, example]) => ({ label, example })),
    cards: bins.flatMap(([, , list], bin) => parse(list).map((card) => ({ card, bin }))),
  }
}

/** A switch deck: the cards are "emoji name a b" (bin a by the first rule, bin b by the second). */
function switchDeck(id: string, title: string, first: [string, string][], second: [string, string][], list: string): Deck {
  const cards: { card: Card; bin: number }[] = []
  const then = new Map<string, number>()
  for (const s of list.split(',').map((x) => x.trim()).filter(Boolean)) {
    const parts = s.split(' ')
    const b2 = Number(parts.pop())
    const b1 = Number(parts.pop())
    const card = { emoji: parts[0], name: parts.slice(1).join(' ') }
    cards.push({ card, bin: b1 })
    then.set(card.emoji, b2)
  }
  return {
    id,
    title,
    section: 'Switch',
    bins: first.map(([label, example]) => ({ label, example })),
    cards,
    then: { bins: second.map(([label, example]) => ({ label, example })), bin: then },
  }
}

export const DECKS: Deck[] = [
  // ——— Kinds ———
  deck('kinds', 'Animals, food, clothes', 'Kinds', [
    ['animals', '🐾', '🐄 cow, 🐖 pig, 🐑 sheep, 🐕 dog, 🐈 cat, 🦁 lion, 🐘 elephant, 🦒 giraffe, 🐒 monkey, 🐻 bear, 🦊 fox, 🐇 rabbit, 🐟 fish, 🦋 butterfly, 🐢 turtle'],
    ['food', '🍽️', '🍎 apple, 🍌 banana, 🍇 grapes, 🍓 strawberry, 🥕 carrot, 🥦 broccoli, 🌽 corn, 🍞 bread, 🧀 cheese, 🍕 pizza, 🍔 burger, 🥞 pancakes, 🍪 cookie, 🍰 cake'],
    ['clothes', '👚', '👕 T-shirt, 👖 jeans, 👗 dress, 🧥 coat, 🧦 socks, 👟 sneaker, 👢 boot, 🧢 cap, 🧤 gloves, 🧣 scarf, 🩳 shorts, 👒 sun hat'],
  ]),
  deck('fruitveg', 'Fruit, vegetables', 'Kinds', [
    ['fruit', '🧺', '🍎 apple, 🍌 banana, 🍇 grapes, 🍓 strawberry, 🍊 orange, 🍋 lemon, 🍉 watermelon, 🍍 pineapple, 🍒 cherries, 🍑 peach, 🍐 pear, 🥝 kiwi, 🥭 mango'],
    ['vegetables', '🥗', '🥕 carrot, 🥦 broccoli, 🌽 corn, 🥔 potato, 🧅 onion, 🧄 garlic, 🥬 lettuce'],
  ]),
  deck('habitat', 'Farm, wild, sea', 'Kinds', [
    ['farm', '🚜', '🐄 cow, 🐖 pig, 🐑 sheep, 🐐 goat, 🐎 horse, 🐓 rooster, 🦃 turkey'],
    ['wild', '🌳', '🦁 lion, 🐅 tiger, 🐘 elephant, 🦒 giraffe, 🦓 zebra, 🐒 monkey, 🦍 gorilla, 🐻 bear, 🦊 fox, 🐺 wolf, 🦏 rhino, 🦘 kangaroo'],
    ['sea', '🌊', '🐠 tropical fish, 🐡 blowfish, 🦈 shark, 🐬 dolphin, 🐳 whale, 🐙 octopus, 🦑 squid, 🦐 shrimp, 🦞 lobster'],
  ]),
  deck('travel', 'Land, water, air', 'Kinds', [
    ['land', '🛣️', '🚗 car, 🚌 bus, 🚲 bicycle, 🚂 train, 🚜 tractor, 🚒 fire truck, 🚑 ambulance, 🚓 police car, 🛴 scooter, 🏍️ motorcycle, 🚚 truck'],
    ['water', '🌊', '⛵ sailboat, 🚤 speedboat, 🛶 canoe, 🚢 ship'],
    ['air', '☁️', '✈️ airplane, 🛩️ small plane, 🚁 helicopter, 🚀 rocket'],
  ]),
  deck('critters', 'Birds, bugs, fish', 'Kinds', [
    ['birds', '🪶', '🦅 eagle, 🦉 owl, 🐧 penguin, 🦩 flamingo, 🦚 peacock, 🕊️ dove, 🦢 swan, 🐦 bird, 🦜 parrot, 🐓 rooster, 🦆 duck'],
    ['bugs', '🍃', '🐝 bee, 🦋 butterfly, 🐞 ladybug, 🐜 ant, 🦗 cricket, 🪲 beetle, 🐛 caterpillar, 🕷️ spider'],
    ['fish', '🎣', '🐟 fish, 🐠 tropical fish, 🐡 blowfish, 🦈 shark'],
  ]),
  deck('things', 'Toys, tools, music', 'Kinds', [
    ['toys', '🎠', '🧸 teddy bear, 🪀 yo-yo, 🪁 kite, 🧩 puzzle piece, 🎲 dice, 🪆 nesting doll, 🎈 balloon'],
    ['tools', '🧰', '🔨 hammer, 🪛 screwdriver, 🔧 wrench, 🪚 saw, 🪓 axe, 🔩 nut and bolt'],
    ['music', '🎵', '🎸 guitar, 🎹 piano, 🥁 drum, 🎺 trumpet, 🎻 violin, 🎷 saxophone, 🪕 banjo, 🪘 long drum'],
  ]),

  // ——— People ———
  deck('uses1', 'Who uses it? Doctor, cook, artist', 'People', [
    ['doctor', '🧑‍⚕️', '🩺 stethoscope, 💉 syringe, 💊 medicine, 🩹 bandage, 🌡️ thermometer'],
    ['cook', '🧑‍🍳', '🍳 frying pan, 🥘 pan of food, 🍲 pot of stew, 🧂 salt'],
    ['artist', '🧑‍🎨', '🎨 palette, 🖌️ paintbrush, 🖼️ painting'],
  ]),
  deck('uses2', 'Who uses it? Scientist, firefighter, farmer, police', 'People', [
    ['scientist', '🧑‍🔬', '🔬 microscope, 🧪 test tube, 🧫 petri dish, 🔭 telescope'],
    ['firefighter', '🧑‍🚒', '🧯 fire extinguisher, 🚒 fire truck'],
    ['farmer', '🧑‍🌾', '🚜 tractor, 🌾 wheat'],
    ['police', '👮', '🚓 police car, 🚔 police car coming'],
  ]),
  deck('ages', 'Kids, grown-ups, grandparents', 'People', [
    ['kids', '🧒', '👶 baby, 👧 girl, 👦 boy'],
    ['grown-ups', '🧑', '👩 woman, 👨 man, 👮 police officer, 🧑‍⚕️ doctor, 🧑‍🍳 cook, 🧑‍🚒 firefighter, 🧑‍🌾 farmer, 🧑‍🏫 teacher, 🧑‍🚀 astronaut'],
    ['grandparents', '🧓', '👵 grandma, 👴 grandpa'],
  ]),

  // ——— Where it goes ———
  deck('rooms', 'Kitchen, bathroom', 'Where it goes', [
    ['kitchen', '🍽️', '🍳 frying pan, 🥄 spoon, 🍴 fork and knife, 🔪 knife, 🫖 teapot, 🥣 bowl'],
    ['bathroom', '🛁', '🚽 toilet, 🚿 shower, 🧼 soap, 🪥 toothbrush, 🧻 toilet paper'],
  ]),
  deck('beachsnow', 'Beach, snow', 'Where it goes', [
    ['beach', '🏖️', '🩴 sandals, 🦀 crab, 🐚 shell, 🏄 surfer, 👙 swimsuit, 🌴 palm tree'],
    ['snow', '🏔️', '⛄ snowman, 🧤 gloves, 🧣 scarf, 🎿 skis, 🛷 sled, ⛸️ ice skate, 🏂 snowboarder'],
  ]),
  deck('partyschool', 'Party, school', 'Where it goes', [
    ['party', '🥳', '🎂 birthday cake, 🎁 present, 🎈 balloon, 🎉 party popper, 🎊 confetti'],
    ['school', '🏫', '✏️ pencil, 📚 books, 🎒 backpack, 📏 ruler, 📓 notebook, 🧮 abacus'],
  ]),

  // ——— What it is ———
  deck('flies', 'Flies, doesn’t fly', 'What it is', [
    ['flies', '🌤️', '🦅 eagle, 🦉 owl, 🕊️ dove, 🐦 bird, 🦜 parrot, 🦇 bat, 🐝 bee, 🦋 butterfly, 🐞 ladybug, 🦢 swan, 🦆 duck'],
    ['doesn’t fly', '🚶', '🐄 cow, 🐖 pig, 🐕 dog, 🐈 cat, 🦁 lion, 🐘 elephant, 🦒 giraffe, 🐍 snake, 🐢 turtle, 🐟 fish, 🐌 snail, 🐧 penguin, 🐛 caterpillar, 🕷️ spider, 🐸 frog'],
  ]),
  deck('wheels', 'Wheels, no wheels', 'What it is', [
    ['wheels', '🚙', '🚗 car, 🚌 bus, 🚲 bicycle, 🚂 train, 🚜 tractor, 🚒 fire truck, 🛴 scooter, 🏍️ motorcycle, 🚚 truck, 🛹 skateboard, 🛒 shopping cart'],
    ['no wheels', '🚫', '⛵ sailboat, 🚤 speedboat, 🛶 canoe, 🚢 ship, 🛷 sled, 🎿 skis'],
  ]),
  deck('waterland', 'Lives in water, lives on land', 'What it is', [
    ['water', '🌊', '🐟 fish, 🐠 tropical fish, 🐡 blowfish, 🦈 shark, 🐬 dolphin, 🐳 whale, 🐙 octopus, 🦑 squid, 🦐 shrimp, 🦞 lobster'],
    ['land', '🌄', '🐄 cow, 🐖 pig, 🐑 sheep, 🐕 dog, 🐈 cat, 🦁 lion, 🐘 elephant, 🦒 giraffe, 🦓 zebra, 🐒 monkey, 🐻 bear, 🦊 fox, 🐇 rabbit, 🐍 snake, 🦎 lizard'],
  ]),
  deck('alive', 'Alive, not alive', 'What it is', [
    ['alive', '💓', '🐕 dog, 🐈 cat, 🐟 fish, 🐦 bird, 🐝 bee, 🌳 tree, 🌻 sunflower, 🌵 cactus, 🌷 tulip, 👶 baby'],
    ['not alive', '🧱', '🪨 rock, 🚗 car, ⚽ soccer ball, 🔨 hammer, 🪑 chair, 🧸 teddy bear, ✏️ pencil, 🎈 balloon, 🤖 robot, ⛄ snowman'],
  ]),
  deck('legs', 'How many legs? 0, 2, 4, 6, 8', 'What it is', [
    ['0 legs', '0', '🐟 fish, 🐍 snake, 🐬 dolphin, 🐳 whale, 🦈 shark, 🪱 worm'],
    ['2 legs', '2', '🐓 rooster, 🦅 eagle, 🦉 owl, 🐧 penguin, 🦩 flamingo, 🦆 duck, 👦 boy'],
    ['4 legs', '4', '🐄 cow, 🐕 dog, 🐈 cat, 🦁 lion, 🐘 elephant, 🦒 giraffe, 🐢 turtle, 🦎 lizard'],
    ['6 legs', '6', '🐝 bee, 🐜 ant, 🐞 ladybug, 🦋 butterfly, 🦗 cricket, 🪲 beetle'],
    ['8 legs', '8', '🕷️ spider, 🐙 octopus, 🦂 scorpion'],
  ]),

  // ——— Switch: the same cards, sorted two ways ———
  switchDeck(
    'fruitcolour',
    'Fruit or vegetable, then by colour',
    [
      ['fruit', '🧺'],
      ['vegetables', '🥗'],
    ],
    [
      ['red', '🟥'],
      ['green', '🟩'],
      ['yellow', '🟨'],
    ],
    '🍎 apple 0 0, 🍓 strawberry 0 0, 🍒 cherries 0 0, 🍏 green apple 0 1, 🍐 pear 0 1, 🍌 banana 0 2, 🍋 lemon 0 2, 🥦 broccoli 1 1, 🥬 lettuce 1 1, 🌽 corn 1 2',
  ),
  switchDeck(
    'farmlegs',
    'Farm or wild, then by legs',
    [
      ['farm', '🚜'],
      ['wild', '🌳'],
    ],
    [
      ['2 legs', '2'],
      ['4 legs', '4'],
    ],
    '🐄 cow 0 1, 🐖 pig 0 1, 🐑 sheep 0 1, 🐐 goat 0 1, 🐓 rooster 0 0, 🦃 turkey 0 0, 🦁 lion 1 1, 🐅 tiger 1 1, 🦓 zebra 1 1, 🐘 elephant 1 1, 🦅 eagle 1 0, 🦉 owl 1 0',
  ),
]

/** How many cards a round deals (all of them, if the deck is smaller). */
export const DEAL = 12

/** A round's cards: spread fairly across the bins (round robin from each, shuffled), then shuffled. */
export function deal(d: Deck, n = DEAL, random = Math.random): Card[] {
  if (d.then) return shuffle(d.cards.map((c) => c.card), random)
  const piles = d.bins.map((_, b) => shuffle(d.cards.filter((c) => c.bin === b).map((c) => c.card), random))
  const out: Card[] = []
  while (out.length < n && piles.some((p) => p.length)) for (const p of piles) if (p.length && out.length < n) out.push(p.pop()!)
  return shuffle(out, random)
}

function shuffle<T>(a: T[], random: () => number): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

/** The right bin for a card in a deck (the second rule's, for a switch deck's second round). */
export function rightBin(d: Deck, card: Card, second = false): number {
  if (second && d.then) return d.then.bin.get(card.emoji)!
  return d.cards.find((c) => c.card.emoji === card.emoji)!.bin
}
