/**
 * The picture library behind Gifted's picture subtests (and, later, other
 * apps). Every picture is a standard emoji (Unicode ≤ 13, so it renders on
 * the tablet's own emoji font), tagged with the groups it belongs to.
 *
 * Built from the research dataset (Drive: Gifted/picture_catalog.csv): the
 * groups follow its classification_groups and attributes, kept to what a
 * picture can show and a young child can know. Tier-3 "surprising" facts
 * (a bat is a mammal) only appear at the top levels.
 *
 * Fairness rule: a group lists its `unsure` members — things where a
 * reasonable person could argue either way (does an airplane have wheels?
 * do chickens fly?). An unsure picture is never used in an item whose
 * reasoning rests on that group, so every item has exactly one defensible
 * answer.
 */

export interface Picture {
  id: string
  emoji: string
  name: string
  tags: string[]
}

export interface Group {
  id: string
  /** Plural label, for the explanation: "They are all fruits." */
  label: string
  /** Lowest item level at which this group is used as the rule. */
  level: number
  unsure?: string[]
}

// id | emoji | name | tags (space-separated group ids)
const TABLE = `
cow|🐄|cow|animal farm mammal
pig|🐖|pig|animal farm mammal
sheep|🐑|sheep|animal farm mammal
goat|🐐|goat|animal farm mammal
horse|🐎|horse|animal farm mammal
rooster|🐓|rooster|animal farm bird
hen|🐔|hen|animal farm bird
turkey|🦃|turkey|animal farm bird
duck|🦆|duck|animal farm bird water flies
rabbit|🐇|rabbit|animal mammal pet
dog|🐕|dog|animal mammal pet
cat|🐈|cat|animal mammal pet
hamster|🐹|hamster|animal mammal pet
parrot|🦜|parrot|animal bird pet flies
lion|🦁|lion|animal wild mammal
tiger|🐅|tiger|animal wild mammal
elephant|🐘|elephant|animal wild mammal
giraffe|🦒|giraffe|animal wild mammal
zebra|🦓|zebra|animal wild mammal
monkey|🐒|monkey|animal wild mammal
gorilla|🦍|gorilla|animal wild mammal
bear|🐻|bear|animal wild mammal
panda|🐼|panda|animal wild mammal
fox|🦊|fox|animal wild mammal
wolf|🐺|wolf|animal wild mammal
deer|🦌|deer|animal wild mammal
kangaroo|🦘|kangaroo|animal wild mammal
hippo|🦛|hippo|animal wild mammal
rhino|🦏|rhino|animal wild mammal
camel|🐪|camel|animal wild mammal
hedgehog|🦔|hedgehog|animal wild mammal
squirrel|🐿️|squirrel|animal wild mammal
bat|🦇|bat|animal wild mammal flies
eagle|🦅|eagle|animal bird flies
owl|🦉|owl|animal bird flies
penguin|🐧|penguin|animal bird water cold
flamingo|🦩|flamingo|animal bird
peacock|🦚|peacock|animal bird
dove|🕊️|dove|animal bird flies
swan|🦢|swan|animal bird water flies
bird|🐦|bird|animal bird flies
fish|🐟|fish|animal fish water sea
tropicalfish|🐠|tropical fish|animal fish water sea
blowfish|🐡|blowfish|animal fish water sea
shark|🦈|shark|animal fish water sea
dolphin|🐬|dolphin|animal mammal water sea
whale|🐳|whale|animal mammal water sea
seal|🦭|seal|animal mammal water sea
octopus|🐙|octopus|animal water sea eightlegs
crab|🦀|crab|animal water sea
lobster|🦞|lobster|animal water sea
shrimp|🦐|shrimp|animal water sea
squid|🦑|squid|animal water sea
bee|🐝|bee|animal insect flies bug
butterfly|🦋|butterfly|animal insect flies bug
ladybug|🐞|ladybug|animal insect bug flies
ant|🐜|ant|animal insect bug
cricket|🦗|cricket|animal insect bug
beetle|🪲|beetle|animal insect bug
caterpillar|🐛|caterpillar|animal bug
spider|🕷️|spider|animal bug eightlegs
scorpion|🦂|scorpion|animal bug eightlegs
snail|🐌|snail|animal bug
worm|🪱|worm|animal bug
snake|🐍|snake|animal reptile
crocodile|🐊|crocodile|animal reptile water
lizard|🦎|lizard|animal reptile
turtle|🐢|turtle|animal reptile water
frog|🐸|frog|animal water
apple|🍎|apple|food fruit
banana|🍌|banana|food fruit
grapes|🍇|grapes|food fruit
strawberry|🍓|strawberry|food fruit
orange|🍊|orange|food fruit
lemon|🍋|lemon|food fruit
watermelon|🍉|watermelon|food fruit
pineapple|🍍|pineapple|food fruit
cherries|🍒|cherries|food fruit
peach|🍑|peach|food fruit
pear|🍐|pear|food fruit
kiwi|🥝|kiwi|food fruit
mango|🥭|mango|food fruit
coconut|🥥|coconut|food fruit
carrot|🥕|carrot|food vegetable
broccoli|🥦|broccoli|food vegetable
corn|🌽|corn|food vegetable
potato|🥔|potato|food vegetable
onion|🧅|onion|food vegetable
garlic|🧄|garlic|food vegetable
lettuce|🥬|lettuce|food vegetable
bread|🍞|bread|food
cheese|🧀|cheese|food
egg|🥚|egg|food
pizza|🍕|pizza|food
burger|🍔|burger|food
hotdog|🌭|hot dog|food
pancakes|🥞|pancakes|food
spaghetti|🍝|spaghetti|food
cookie|🍪|cookie|food sweet
cake|🍰|cake|food sweet
donut|🍩|donut|food sweet
icecream|🍦|ice cream|food sweet cold
chocolate|🍫|chocolate|food sweet
lollipop|🍭|lollipop|food sweet
cupcake|🧁|cupcake|food sweet
honey|🍯|honey|food sweet
milk|🥛|milk|drink
juice|🧃|juice|drink
hotdrink|☕|hot drink|drink hot
car|🚗|car|vehicle land wheels
bus|🚌|bus|vehicle land wheels
bicycle|🚲|bicycle|vehicle land wheels
train|🚂|train|vehicle land wheels
tractor|🚜|tractor|vehicle land wheels
firetruck|🚒|fire truck|vehicle land wheels
ambulance|🚑|ambulance|vehicle land wheels
policecar|🚓|police car|vehicle land wheels
scooter|🛴|scooter|vehicle land wheels
motorcycle|🏍️|motorcycle|vehicle land wheels
truck|🚚|truck|vehicle land wheels
skateboard|🛹|skateboard|wheels toy
cart|🛒|shopping cart|wheels
airplane|✈️|airplane|vehicle air flies
helicopter|🚁|helicopter|vehicle air flies
rocket|🚀|rocket|vehicle air flies
sailboat|⛵|sailboat|vehicle boat
speedboat|🚤|speedboat|vehicle boat
canoe|🛶|canoe|vehicle boat
ship|🚢|ship|vehicle boat
tshirt|👕|T-shirt|clothes
jeans|👖|jeans|clothes
dress|👗|dress|clothes
coat|🧥|coat|clothes cold
socks|🧦|socks|clothes feet
sneaker|👟|sneaker|clothes feet
boot|👢|boot|clothes feet
sandal|🩴|sandal|clothes feet
cap|🧢|cap|clothes head
tophat|🎩|top hat|clothes head
sunhat|👒|sun hat|clothes head
crown|👑|crown|head
gloves|🧤|gloves|clothes hands cold
scarf|🧣|scarf|clothes cold
glasses|👓|glasses|eyes
sunglasses|🕶️|sunglasses|eyes
shorts|🩳|shorts|clothes
hammer|🔨|hammer|tool
screwdriver|🪛|screwdriver|tool
wrench|🔧|wrench|tool
saw|🪚|saw|tool
ladder|🪜|ladder|tool
broom|🧹|broom|tool
bucket|🪣|bucket|tool
magnet|🧲|magnet|tool
scissors|✂️|scissors|tool school
ruler|📏|ruler|school
pencil|✏️|pencil|school
crayon|🖍️|crayon|school
paintbrush|🖌️|paintbrush|school
books|📚|books|school
backpack|🎒|backpack|school
spoon|🥄|spoon|kitchen
forkknife|🍴|fork and knife|kitchen
knife|🔪|knife|kitchen
chopsticks|🥢|chopsticks|kitchen
teapot|🫖|teapot|kitchen
pan|🍳|frying pan|kitchen hot
plate|🍽️|plate|kitchen
bowl|🥣|bowl|kitchen
guitar|🎸|guitar|music
piano|🎹|piano|music
drum|🥁|drum|music
trumpet|🎺|trumpet|music
violin|🎻|violin|music
saxophone|🎷|saxophone|music
banjo|🪕|banjo|music
bell|🔔|bell|music
soccer|⚽|soccer ball|ball round
basketball|🏀|basketball|ball round
football|🏈|football|ball
baseball|⚾|baseball|ball round
tennis|🎾|tennis ball|ball round
volleyball|🏐|volleyball|ball round
teddy|🧸|teddy bear|toy
yoyo|🪀|yo-yo|toy round
kite|🪁|kite|toy flies
balloon|🎈|balloon|toy flies
puzzle|🧩|puzzle piece|toy
dice|🎲|dice|toy
sun|☀️|sun|sky hot light
moon|🌙|moon|sky light
star|⭐|star|sky
cloud|☁️|cloud|sky weather
raincloud|🌧️|rain|sky weather
snowflake|❄️|snowflake|weather cold
snowman|⛄|snowman|cold
rainbow|🌈|rainbow|sky weather
lightning|⚡|lightning|sky weather
tornado|🌪️|tornado|sky weather
fog|🌫️|fog|sky weather
fire|🔥|fire|hot light
icecube|🧊|ice|cold
tree|🌳|tree|plant
pine|🌲|pine tree|plant
palm|🌴|palm tree|plant
cactus|🌵|cactus|plant
sunflower|🌻|sunflower|plant flower
tulip|🌷|tulip|plant flower
rose|🌹|rose|plant flower
blossom|🌸|blossom|plant flower
hibiscus|🌺|hibiscus|plant flower
seedling|🌱|seedling|plant
leaf|🍃|leaf|plant
eyes|👀|eyes|body
ear|👂|ear|body
nose|👃|nose|body
mouth|👄|mouth|body
hand|✋|hand|body
foot|🦶|foot|body
tooth|🦷|tooth|body
house|🏠|house|building
school|🏫|school|building
hospital|🏥|hospital|building
castle|🏰|castle|building
tent|⛺|tent|building
bulb|💡|light bulb|light
flashlight|🔦|flashlight|light
candle|🕯️|candle|light hot
alarmclock|⏰|alarm clock|time
watch|⌚|watch|time
hourglass|⌛|hourglass|time
clock|🕰️|clock|time
key|🔑|key|tool
lock|🔒|lock|
feather|🪶|feather|
wood|🪵|wood|
ocean|🌊|ocean|
road|🛣️|road|
railway|🛤️|railway track|
desert|🏜️|desert|
yarn|🧶|yarn|
paper|📄|paper|
bone|🦴|bone|
grass|🌾|wheat|plant
nut|🌰|chestnut|food
bamboo|🎋|bamboo|plant
door|🚪|door|
chick|🐥|chick|animal bird farm
hatching|🐣|hatching chick|animal bird
baby|👶|baby|person
adult|🧑|grown-up|person
umbrella|☂️|umbrella|
firefighter|🧑‍🚒|firefighter|person worker
cook|🧑‍🍳|cook|person worker
farmer|🧑‍🌾|farmer|person worker
astronaut|🧑‍🚀|astronaut|person worker
artist|🧑‍🎨|artist|person worker
doctor|🧑‍⚕️|doctor|person worker
police|👮|police officer|person worker
extinguisher|🧯|fire extinguisher|
palette|🎨|paint palette|
stethoscope|🩺|stethoscope|
headphones|🎧|headphones|
lipstick|💄|lipstick|
`

export const PICTURES: Picture[] = TABLE.trim()
  .split('\n')
  .map((line) => {
    const [id, emoji, name, tags] = line.split('|')
    return { id, emoji, name, tags: tags ? tags.split(' ').filter(Boolean) : [] }
  })

export const PIC: Record<string, Picture> = Object.fromEntries(PICTURES.map((p) => [p.id, p]))

/**
 * The rules classification items are built on, easiest first. Levels:
 * 1–2 everyday categories, 3–4 sub-categories and functions, 5–6 groups
 * that cut across appearance (things that fly; insects vs spiders).
 */
export const GROUPS: Group[] = [
  { id: 'animal', label: 'animals', level: 1, unsure: ['baby', 'adult', 'firefighter', 'cook', 'farmer', 'astronaut', 'artist', 'doctor', 'police'] },
  { id: 'fruit', label: 'fruits', level: 1, unsure: ['nut'] },
  { id: 'vehicle', label: 'things that take you places', level: 1, unsure: ['skateboard', 'cart', 'horse', 'camel', 'elephant'] },
  { id: 'clothes', label: 'clothes', level: 1, unsure: ['crown', 'glasses', 'sunglasses'] },
  { id: 'music', label: 'things that make music', level: 2 },
  { id: 'ball', label: 'balls', level: 2 },
  { id: 'vegetable', label: 'vegetables', level: 2 },
  { id: 'sweet', label: 'sweet treats', level: 2, unsure: ['juice', 'pancakes'] },
  { id: 'flower', label: 'flowers', level: 2 },
  { id: 'body', label: 'parts of your body', level: 2, unsure: ['bone'] },
  { id: 'farm', label: 'farm animals', level: 3, unsure: ['rabbit', 'duck'] },
  { id: 'sea', label: 'animals that live in the sea', level: 3, unsure: ['seal', 'turtle', 'crab'] },
  { id: 'bird', label: 'birds', level: 3 },
  { id: 'tool', label: 'tools', level: 3, unsure: ['key', 'scissors', 'magnet', 'extinguisher', 'stethoscope', 'flashlight', 'ruler', 'knife', 'pan', 'spoon', 'forkknife', 'chopsticks', 'paintbrush', 'pencil', 'crayon', 'broom', 'bucket', 'ladder'] },
  { id: 'kitchen', label: 'things in a kitchen', level: 3 },
  { id: 'school', label: 'things for school', level: 3, unsure: ['scissors'] },
  { id: 'feet', label: 'things you wear on your feet', level: 3 },
  { id: 'head', label: 'things you wear on your head', level: 3, unsure: ['headphones', 'glasses', 'sunglasses'] },
  { id: 'boat', label: 'boats', level: 4 },
  { id: 'wheels', label: 'things with wheels', level: 4, unsure: ['airplane', 'helicopter', 'rocket'] },
  { id: 'cold', label: 'cold things', level: 4, unsure: ['penguin', 'coat', 'gloves', 'scarf', 'milk', 'juice'] },
  { id: 'light', label: 'things that give light', level: 4, unsure: ['fire', 'star', 'lightning'] },
  { id: 'time', label: 'things that tell time', level: 4 },
  { id: 'weather', label: 'kinds of weather', level: 4, unsure: ['cloud', 'rainbow', 'snowman', 'sun'] },
  {
    id: 'flies',
    label: 'things that can fly',
    level: 5,
    unsure: ['rooster', 'hen', 'turkey', 'chick', 'hatching', 'peacock', 'flamingo', 'ant', 'cricket', 'beetle', 'squirrel', 'feather'],
  },
  {
    id: 'water',
    label: 'things that live in water',
    level: 5,
    unsure: ['duck', 'swan', 'penguin', 'crocodile', 'turtle', 'frog', 'hippo', 'seal', 'flamingo'],
  },
  { id: 'insect', label: 'insects (six legs)', level: 5, unsure: ['caterpillar', 'worm', 'snail'] },
  { id: 'mammal', label: 'mammals', level: 6, unsure: ['baby', 'adult', 'firefighter', 'cook', 'farmer', 'astronaut', 'artist', 'doctor', 'police'] },
  { id: 'reptile', label: 'reptiles', level: 6 },
]

export const GROUP: Record<string, Group> = Object.fromEntries(GROUPS.map((g) => [g.id, g]))

export const inGroup = (p: Picture, g: string) => p.tags.includes(g)
export const unsureIn = (p: Picture, g: string) => !!GROUP[g]?.unsure?.includes(p.id)

/** Members that are clearly in the group — never the arguable ones. */
export const clearMembers = (g: string) => PICTURES.filter((p) => inGroup(p, g) && !unsureIn(p, g))
/** Pictures clearly outside the group. */
export const clearNonMembers = (g: string) => PICTURES.filter((p) => !inGroup(p, g) && !unsureIn(p, g))

/* ---------- relationships, for analogies ---------- */

export interface Relation {
  id: string
  /** Explanation: "{a} {verb} {b}." — e.g. "A rabbit eats a carrot." */
  verb: string
  level: number
  pairs: Array<[string, string]>
  /**
   * Is the first pair's answer a FAIR trap? ("Monkey eats …" with carrot
   * offered is not — a monkey could eat a carrot.)
   */
  lureFirst: boolean
  /** Kinds of things kept out of the choices entirely (cheese for "cow gives us …"). */
  avoid: string[]
}

/**
 * Typed relationships. An analogy uses two pairs from ONE relation, so the
 * child has to find the relationship, not just an association.
 */
export const RELATIONS: Relation[] = [
  {
    id: 'eats',
    verb: 'eats',
    level: 1,
    lureFirst: false,
    avoid: ['food', 'drink', 'plant'],
    pairs: [
      ['rabbit', 'carrot'],
      ['monkey', 'banana'],
      ['dog', 'bone'],
      ['panda', 'bamboo'],
      ['squirrel', 'nut'],
      ['bear', 'honey'],
      ['cat', 'fish'],
      ['bird', 'worm'],
    ],
  },
  {
    id: 'comesFrom',
    verb: 'gives us',
    level: 2,
    lureFirst: true,
    // A wool coat is arguably what a sheep "gives us" too.
    avoid: ['food', 'drink', 'clothes'],
    pairs: [
      ['cow', 'milk'],
      ['hen', 'egg'],
      ['bee', 'honey'],
      ['sheep', 'yarn'],
      ['grass', 'bread'],
      ['tree', 'wood'],
    ],
  },
  {
    id: 'wornOn',
    verb: 'goes on your',
    level: 2,
    lureFirst: true,
    avoid: ['clothes', 'head', 'eyes'],
    pairs: [
      ['gloves', 'hand'],
      ['socks', 'foot'],
      ['glasses', 'eyes'],
      ['headphones', 'ear'],
      ['lipstick', 'mouth'],
    ],
  },
  {
    id: 'growsInto',
    verb: 'grows into',
    level: 3,
    lureFirst: true,
    avoid: ['bird', 'insect', 'plant', 'person'],
    pairs: [
      ['hatching', 'hen'],
      ['caterpillar', 'butterfly'],
      ['seedling', 'tree'],
      ['baby', 'adult'],
    ],
  },
  {
    id: 'travelsOn',
    verb: 'goes on',
    level: 3,
    lureFirst: true,
    avoid: ['sky', 'vehicle'],
    pairs: [
      ['car', 'road'],
      ['train', 'railway'],
      ['sailboat', 'ocean'],
      ['airplane', 'cloud'],
      ['rocket', 'moon'],
    ],
  },
  {
    id: 'usedFor',
    verb: 'is used with',
    level: 4,
    lureFirst: true,
    avoid: ['tool', 'kitchen', 'school'],
    pairs: [
      ['key', 'lock'],
      ['scissors', 'paper'],
      ['paintbrush', 'palette'],
      ['spoon', 'bowl'],
      ['hammer', 'wood'],
    ],
  },
  {
    id: 'weatherNeeds',
    verb: 'calls for',
    level: 4,
    lureFirst: false,
    avoid: ['clothes', 'eyes', 'weather'],
    pairs: [
      ['raincloud', 'umbrella'],
      ['sun', 'sunglasses'],
      ['snowflake', 'scarf'],
      ['fire', 'extinguisher'],
    ],
  },
  {
    id: 'livesIn',
    verb: 'lives in the',
    level: 5,
    lureFirst: true,
    avoid: ['plant', 'building', 'cold'],
    pairs: [
      ['fish', 'ocean'],
      ['camel', 'desert'],
      ['monkey', 'palm'],
      ['squirrel', 'tree'],
      ['penguin', 'icecube'],
    ],
  },
  {
    id: 'worksWith',
    verb: 'works with a',
    level: 5,
    lureFirst: true,
    avoid: ['tool', 'kitchen', 'vehicle', 'person'],
    pairs: [
      ['firefighter', 'extinguisher'],
      ['cook', 'pan'],
      ['astronaut', 'rocket'],
      ['artist', 'palette'],
      ['doctor', 'stethoscope'],
      ['farmer', 'tractor'],
      ['police', 'policecar'],
    ],
  },
]

/** Pictures related to `x` by ANY relation (either direction) — potential lures. */
export function relatedTo(x: string): string[] {
  const out = new Set<string>()
  for (const r of RELATIONS) for (const [a, b] of r.pairs) if (a === x) out.add(b)
  return [...out]
}

/* ---------- ordered sequences, for picture series ---------- */

export interface Sequence {
  id: string
  label: string
  level: number
  steps: string[] // emoji, in order
}

export const SEQUENCES: Sequence[] = [
  { id: 'chick', label: 'An egg hatches and the chick grows into a hen.', level: 1, steps: ['🥚', '🐣', '🐥', '🐔'] },
  { id: 'plant', label: 'A seed sprouts, grows and blooms.', level: 2, steps: ['🌰', '🌱', '🌿', '🌷'] },
  { id: 'moon', label: 'The moon gets fuller each night.', level: 3, steps: ['🌑', '🌒', '🌓', '🌔', '🌕'] },
  { id: 'moonWane', label: 'The moon gets thinner each night.', level: 4, steps: ['🌕', '🌖', '🌗', '🌘', '🌑'] },
  { id: 'butterfly', label: 'A caterpillar becomes a butterfly.', level: 2, steps: ['🥚', '🐛', '🦋'] },
]

/** Clock faces, one per hour: 🕐 is 1 o'clock … 🕛 is 12. */
export const CLOCKS = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛']
