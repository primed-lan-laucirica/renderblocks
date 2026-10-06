/**
 * The sorting decks (Drive: Sorting/Sorting-research.md). Every deck is a
 * hand-picked list, card by card, so each card has exactly one right bin —
 * the fairness rule from Gifted: anything a reasonable person could put in
 * two of the bins on screen is left out rather than marked wrong. Judged
 * strictly (Lan, v1.73.1: "goat and turkey can both be either domestic or
 * wild"): a goat, turkey, pig, horse, duck or elephant lives both ways; a
 * pig, cow, sheep, rabbit, turtle or fish is also food ("pigs are both
 * animals and food"); corn is a grain; grandparents are grown-ups; a balloon
 * is a party thing as much as a toy; an octopus has arms; sea snakes swim;
 * farm ducks don't fly; soap is in kitchens too; anyone uses salt, bandages
 * and thermometers.
 *
 * And the categories themselves must be clear-cut, not just the cards (Lan:
 * "if enough intelligence is applied some answers end up being wrong… we
 * need to just be very clear-cut about everything"). So no fruit vs
 * vegetable (a tomato is botanically a fruit), no farm vs wild, no animals
 * vs food, no "bugs", no toys vs instruments: only groups that are true by
 * definition or plain fact (legs, wheels, flies, alive, shape, colour, odd
 * and even).
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
  // Not animals vs food: animals are food (Lan). Three groups nothing can belong to two of.
  deck('kinds', 'Animals, vehicles, clothes', 'Kinds', [
    ['animals', '🐾', '🐕 dog, 🐈 cat, 🦁 lion, 🐅 tiger, 🐘 elephant, 🦒 giraffe, 🦓 zebra, 🐒 monkey, 🦍 gorilla, 🐻 bear, 🦊 fox, 🦘 kangaroo, 🦋 butterfly'],
    ['vehicles', '🚦', '🚗 car, 🚌 bus, 🚲 bicycle, 🚂 train, 🚜 tractor, 🚒 fire truck, 🚑 ambulance, ✈️ airplane, 🚁 helicopter, ⛵ sailboat, 🚢 ship, 🏍️ motorcycle, 🚚 truck'],
    ['clothes', '👚', '👕 T-shirt, 👖 jeans, 👗 dress, 🧥 coat, 🧦 socks, 👟 sneaker, 👢 boot, 🧢 cap, 🧤 gloves, 🧣 scarf, 🩳 shorts, 👒 sun hat'],
  ]),
  deck('travel', 'Land, water, air', 'Kinds', [
    ['land', '🛣️', '🚗 car, 🚌 bus, 🚲 bicycle, 🚂 train, 🚜 tractor, 🚒 fire truck, 🚑 ambulance, 🚓 police car, 🛴 scooter, 🏍️ motorcycle, 🚚 truck'],
    ['water', '🌊', '⛵ sailboat, 🚤 speedboat, 🛶 canoe, 🚢 ship'],
    ['air', '☁️', '✈️ airplane, 🛩️ small plane, 🚁 helicopter'],
  ]),
  deck('critters', 'Birds, insects, fish', 'Kinds', [
    ['birds', '🪶', '🦅 eagle, 🦉 owl, 🐧 penguin, 🦩 flamingo, 🦚 peacock, 🕊️ dove, 🦢 swan, 🐦 bird, 🦜 parrot, 🐓 rooster, 🦆 duck'],
    ['insects', '🍃', '🐝 bee, 🦋 butterfly, 🐞 ladybug, 🐜 ant, 🦗 cricket, 🪲 beetle'],
    ['fish', '🎣', '🐟 fish, 🐠 tropical fish, 🐡 blowfish, 🦈 shark'],
  ]),
  deck('things', 'Tools, music', 'Kinds', [
    ['tools', '🧰', '🔨 hammer, 🪛 screwdriver, 🔧 wrench, 🪚 saw, 🪓 axe'],
    ['music', '🎵', '🎸 guitar, 🎹 piano, 🥁 drum, 🎺 trumpet, 🎻 violin, 🎷 saxophone, 🪕 banjo, 🪘 long drum'],
  ]),

  // ——— People ———
  deck('uses1', 'Who uses it? Doctor, cook, artist', 'People', [
    ['doctor', '🧑‍⚕️', '🩺 stethoscope, 💉 syringe'],
    ['cook', '🧑‍🍳', '🍳 frying pan, 🥘 pan of food, 🍲 pot of stew'],
    ['artist', '🧑‍🎨', '🎨 palette, 🖌️ paintbrush, 🖼️ painting'],
  ]),
  deck('uses2', 'Who uses it? Scientist, firefighter, farmer, police', 'People', [
    ['scientist', '🧑‍🔬', '🔬 microscope, 🧪 test tube, 🧫 petri dish, 🔭 telescope'],
    ['firefighter', '🧑‍🚒', '🧯 fire extinguisher, 🚒 fire truck'],
    ['farmer', '🧑‍🌾', '🚜 tractor, 🌾 wheat'],
    ['police', '👮', '🚓 police car, 🚔 police car coming'],
  ]),
  deck('ages', 'Kids, grown-ups', 'People', [
    ['kids', '🧒', '👶 baby, 👧 girl, 👦 boy'],
    ['grown-ups', '🧑', '👩 woman, 👨 man, 👵 grandma, 👴 grandpa, 👮 police officer, 🧑‍⚕️ doctor, 🧑‍🍳 cook, 🧑‍🚒 firefighter, 🧑‍🌾 farmer, 🧑‍🏫 teacher, 🧑‍🚀 astronaut'],
  ]),

  // ——— Where it goes ———
  deck('rooms', 'Kitchen, bathroom', 'Where it goes', [
    ['kitchen', '🍽️', '🍳 frying pan, 🥄 spoon, 🍴 fork and knife, 🔪 knife, 🫖 teapot, 🥣 bowl'],
    ['bathroom', '🛁', '🚽 toilet, 🚿 shower, 🪥 toothbrush, 🧻 toilet paper'],
  ]),
  deck('beachsnow', 'Beach, snow', 'Where it goes', [
    ['beach', '🏖️', '🦀 crab, 🐚 shell, 🏄 surfer, 👙 swimsuit'],
    ['snow', '🏔️', '⛄ snowman, 🧤 gloves, 🧣 scarf, 🎿 skis, 🛷 sled, ⛸️ ice skate, 🏂 snowboarder'],
  ]),
  deck('partyschool', 'Party, school', 'Where it goes', [
    ['party', '🥳', '🎂 birthday cake, 🎁 present, 🎈 balloon, 🎉 party popper, 🎊 confetti'],
    ['school', '🏫', '✏️ pencil, 📚 books, 🎒 backpack, 📏 ruler, 📓 notebook, 🧮 abacus'],
  ]),

  // ——— What it is ———
  deck('flies', 'Flies, doesn’t fly', 'What it is', [
    ['flies', '🌤️', '🦅 eagle, 🦉 owl, 🕊️ dove, 🐦 bird, 🦜 parrot, 🦇 bat, 🐝 bee, 🦋 butterfly, 🐞 ladybug, 🦢 swan'],
    ['doesn’t fly', '🚶', '🐄 cow, 🐖 pig, 🐕 dog, 🐈 cat, 🦁 lion, 🐘 elephant, 🦒 giraffe, 🐍 snake, 🐢 turtle, 🐟 fish, 🐌 snail, 🐧 penguin, 🐛 caterpillar, 🕷️ spider, 🐸 frog'],
  ]),
  deck('wheels', 'Wheels, no wheels', 'What it is', [
    ['wheels', '🚙', '🚗 car, 🚌 bus, 🚲 bicycle, 🚂 train, 🚜 tractor, 🚒 fire truck, 🛴 scooter, 🏍️ motorcycle, 🚚 truck, 🛹 skateboard, 🛒 shopping cart'],
    ['no wheels', '🚫', '⛵ sailboat, 🚤 speedboat, 🛶 canoe, 🚢 ship, 🛷 sled, 🎿 skis'],
  ]),
  deck('waterland', 'Lives in water, lives on land', 'What it is', [
    ['water', '🌊', '🐟 fish, 🐠 tropical fish, 🐡 blowfish, 🦈 shark, 🐬 dolphin, 🐳 whale, 🐙 octopus, 🦑 squid, 🦐 shrimp, 🦞 lobster'],
    ['land', '🌄', '🐄 cow, 🐖 pig, 🐑 sheep, 🐕 dog, 🐈 cat, 🦁 lion, 🐘 elephant, 🦒 giraffe, 🦓 zebra, 🐒 monkey, 🐻 bear, 🦊 fox, 🐇 rabbit, 🦎 lizard'],
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
    ['8 legs', '8', '🕷️ spider, 🦂 scorpion'],
  ]),

  // ——— Switch: the same cards, sorted two ways (rules that are true by definition) ———
  switchDeck(
    'shapecolour',
    'Circle or square, then by colour',
    [
      ['circles', '⚪'],
      ['squares', '⬜'],
    ],
    [
      ['red', '❤️'],
      ['blue', '💙'],
      ['green', '💚'],
      ['yellow', '💛'],
    ],
    '🔴 red circle 0 0, 🟥 red square 1 0, 🔵 blue circle 0 1, 🟦 blue square 1 1, 🟢 green circle 0 2, 🟩 green square 1 2, 🟡 yellow circle 0 3, 🟨 yellow square 1 3',
  ),
  switchDeck(
    'oddeven',
    'Odd or even, then under 5 or 5 and up',
    [
      ['odd', '1 3'],
      ['even', '2 4'],
    ],
    [
      ['under 5', '1–4'],
      ['5 and up', '5–9'],
    ],
    '1️⃣ one 0 0, 2️⃣ two 1 0, 3️⃣ three 0 0, 4️⃣ four 1 0, 5️⃣ five 0 1, 6️⃣ six 1 1, 7️⃣ seven 0 1, 8️⃣ eight 1 1, 9️⃣ nine 0 1',
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
