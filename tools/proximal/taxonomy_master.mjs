/**
 * Proximal Master Multi-Subject Uncapped Taxonomy (PreK -> University/Frontier)
 *
 * Grounded in RenderBlocks curriculum maps (Khan K-6 + High School/AP, NGSS K-12,
 * phonics_skill_progression_v2, Gifted skills_map, Great Stories & Cosmic Ed,
 * and CS/AI/Higher Math) with NO upper bound on learner capability.
 */

export const SUBJECTS = [
  { id: 'math', label: 'Mathematics', color: '#EF4444' },
  { id: 'ela', label: 'Reading, Phonics & Language', color: '#EC4899' },
  { id: 'science', label: 'Science & Engineering', color: '#10B981' },
  { id: 'cs-logic', label: 'Logic, Coding & AI', color: '#8B5CF6' },
  { id: 'world-history', label: 'World, Geography & History', color: '#F59E0B' },
  { id: 'arts-music', label: 'Art, Color & Music', color: '#06B6D4' },
]

export const LEVEL_BANDS = [
  { id: 'prek', label: 'Preschool (PreK)', order: 0 },
  { id: 'k_2', label: 'Early Primary (K–2)', order: 1 },
  { id: 'g3_5', label: 'Upper Elementary (3–5)', order: 2 },
  { id: 'g6_8', label: 'Middle School (6–8)', order: 3 },
  { id: 'hs', label: 'High School (9–12)', order: 4 },
  { id: 'university', label: 'University & Frontier', order: 5 },
]

export const CONCEPT_RULES = [
  // ────────────────────────── MATHEMATICS ──────────────────────────
  {
    id: 'counting',
    subject: 'math',
    label: 'Counting & Numbers',
    minBand: 'prek',
    needs: [],
    re: /\b(count\w*|1 to 10|1 to 20|1 to 100|1-10|1-20|meet the numbers|how many|tally|ordinal|numeral\w*|number one|number two|number three|number four|number five|number six|number seven|number eight|number nine|number ten|number zero)\b/i,
  },
  {
    id: 'number-sense',
    subject: 'math',
    label: 'Number Sense & Subitizing',
    minBand: 'prek',
    needs: ['counting'],
    re: /\b(subitiz\w*|ten frame|number bond\w*|number line|even and odd|odd and even|greater than|less than|compar\w* number|more and less|number sense|cardinality)\b/i,
  },
  {
    id: 'skip-counting',
    subject: 'math',
    label: 'Skip Counting',
    minBand: 'prek',
    needs: ['counting'],
    re: /\b(skip count\w*|count by 2|count by 3|count by 4|count by 5|count by 6|count by 7|count by 8|count by 9|count by 10|counting by twos|counting by fives|counting by tens)\b/i,
  },
  {
    id: 'addition',
    subject: 'math',
    label: 'Addition',
    minBand: 'k_2',
    needs: ['counting'],
    re: /\b(add|adding|addition|plus sign|sum|sums|make 10|making 10|doubles|putting together|addend)\b/i,
  },
  {
    id: 'subtraction',
    subject: 'math',
    label: 'Subtraction',
    minBand: 'k_2',
    needs: ['addition'],
    re: /\b(subtract\w*|minus|take away|taking away|difference|regrouping|borrowing)\b/i,
  },
  {
    id: 'math-facts',
    subject: 'math',
    label: 'Math Facts Fluency',
    minBand: 'k_2',
    needs: ['addition'],
    re: /\b(math facts|math drills|fact famil\w*|mental math|flashcards|times table song)\b/i,
  },
  {
    id: 'place-value',
    subject: 'math',
    label: 'Place Value & Base 10',
    minBand: 'k_2',
    needs: ['counting'],
    re: /\b(place value|ones,? tens|hundreds|thousands|base 10|base ten|teen numbers|expanded form|rounding|roman numeral\w*|scientific notation|powers of 10|powers of ten)\b/i,
  },
  {
    id: 'multiplication',
    subject: 'math',
    label: 'Multiplication, Factors & Primes',
    minBand: 'g3_5',
    needs: ['addition', 'skip-counting'],
    re: /\b(multipl\w*|times table\w*|array\w*|groups of|square numbers|squares|repeated addition|factor\w*|prime number\w*|composite number|gcf|lcm|divisibility)\b/i,
  },
  {
    id: 'division',
    subject: 'math',
    label: 'Division & Sharing',
    minBand: 'g3_5',
    needs: ['multiplication', 'subtraction'],
    re: /\b(divid\w*|division|quotient|remainder|fair share|sharing equally|long division)\b/i,
  },
  {
    id: 'fractions',
    subject: 'math',
    label: 'Fractions, Decimals & Ratios',
    minBand: 'g3_5',
    needs: ['division'],
    re: /\b(fraction\w*|half|halves|quarter\w*|third\w*|numerator|denominator|decimal\w*|percent\w*|improper|mixed number|ratio\w*|proportion\w*|unit rate)\b/i,
  },
  {
    id: 'shapes-geometry',
    subject: 'math',
    label: 'Shapes, Geometry & Trigonometry',
    minBand: 'prek',
    needs: [],
    re: /\b(shape\w*|geometry|triangle\w*|square\w*|rectangle\w*|circle\w*|polygon\w*|hexagon\w*|octagon\w*|quadrilateral|2d|3d|cube\w*|sphere\w*|cylinder\w*|cone\w*|pyramid|angle\w*|symmetry|perimeter|area|volume|coordinate plane|pythagorean|trigonometr\w*|sine|cosine|tangent|euclidean|topology|fractal\w*|polyhedr\w*|tessellation)\b/i,
  },
  {
    id: 'measurement-time-money',
    subject: 'math',
    label: 'Measurement, Time, Money & Data',
    minBand: 'k_2',
    needs: ['counting'],
    re: /\b(telling time|clock|analog|hour|minute|calendar|days of the week|months of the year|money|coin\w*|penny|nickel|dime|dollar|measure\w*|length|inch\w*|centimeter\w*|meter\w*|metric|weight|mass|capacity|bar graph|pictograph|histogram|line plot|mean,? median|box plot|data)\b/i,
  },
  {
    id: 'algebra-equations',
    subject: 'math',
    label: 'Algebra, Integers & Functions',
    minBand: 'g6_8',
    needs: ['multiplication', 'fractions'],
    re: /\b(algebra\w*|negative number\w*|integer\w*|absolute value|variable\w*|equation\w*|inequalit\w*|exponent\w*|square root|quadratic|polynomial\w*|function\w*|slope|linear equation|logarithm\w*|complex number\w*|imaginary number|factoring)\b/i,
  },
  {
    id: 'probability-statistics',
    subject: 'math',
    label: 'Probability & Statistics',
    minBand: 'g6_8',
    needs: ['fractions'],
    re: /\b(probabilit\w*|statistic\w*|combinatoric\w*|permutation\w*|combination\w*|bayes|bayes'|normal distribution|standard deviation|variance|expected value|random variable|markov|regression|p-value|monty hall)\b/i,
  },
  {
    id: 'deep-math',
    subject: 'math',
    label: 'Calculus, Linear Algebra & Higher Math',
    minBand: 'hs',
    needs: ['algebra-equations'],
    re: /\b(calculus|derivative\w*|integral\w*|limit\w*|differential equation|vector\w*|matrix|matrices|eigenvalue\w*|linear algebra|linear transformation|dot product|cross product|fourier|laplace|tensor\w*|group theory|number theory|riemann|infinity|infinite series|taylor series|proof|theorem|set theory|gödel|godel|game theory|chaos theory|euler's)\b/i,
  },

  // ────────────────── READING, PHONICS & LANGUAGE (ELA) ──────────────────
  {
    id: 'phonics-foundations',
    subject: 'ela',
    label: 'Letter Sounds, Alphabet & CVC',
    minBand: 'prek',
    needs: [],
    re: /\b(alphabet|abc song|letter sounds?|phonics|short vowel\w*|cvc word\w*|meet the letters|letter [a-z]\b|alphablocks|blending sounds|rhyming|phonemic|syllable\w*)\b/i,
  },
  {
    id: 'phonics-decoding',
    subject: 'ela',
    label: 'Digraphs, Blends, Vowel Teams & Decoding',
    minBand: 'k_2',
    needs: ['phonics-foundations'],
    re: /\b(digraph\w*|consonant blend\w*|silent e|magic e|vowel team\w*|diphthong\w*|r-controlled|bossy r|soft c|soft g|floss rule|trigraph\w*|sight word\w*|heart word\w*|high frequency word|long vowel\w*|open syllable|closed syllable|silent letter\w*|nessy|spelling rule\w*|homophone\w*)\b/i,
  },
  {
    id: 'grammar-syntax',
    subject: 'ela',
    label: 'Grammar, Parts of Speech & Syntax',
    minBand: 'k_2',
    needs: ['phonics-foundations'],
    re: /\b(grammar|parts? of speech|noun\w*|verb\w*|adjective\w*|adverb\w*|pronoun\w*|preposition\w*|conjunction\w*|interjection\w*|punctuation|comma\w*|apostrophe\w*|quotation mark|sentence\w*|clause\w*|phrase\w*|subject and predicate|contraction\w*|tense|plural|possessive|capitalization|syntax)\b/i,
  },
  {
    id: 'vocabulary-reading',
    subject: 'ela',
    label: 'Vocabulary, Morphology & Reading Comprehension',
    minBand: 'k_2',
    needs: ['phonics-decoding'],
    re: /\b(prefix\w*|suffix\w*|root word\w*|morpholog\w*|context clue\w*|synonym\w*|antonym\w*|idiom\w*|figurative language|metaphor\w*|simile\w*|personification|main idea|theme|point of view|character trait|plot|summary|comprehension|reading|storytelling|fairy tale|fable|poetry|rhetoric|essay|argument|literature|shakespeare)\b/i,
  },
  {
    id: 'linguistics-writing',
    subject: 'ela',
    label: 'Linguistics, Etymology & Writing Systems',
    minBand: 'g6_8',
    needs: ['vocabulary-reading'],
    re: /\b(etymolog\w*|linguistic\w*|writing system\w*|cuneiform|hieroglyph\w*|phoenician|history of (english|writing|the alphabet|language)|phonetics|ipa|language famil\w*|proto-indo-european|semantics|pragmatics|creole|pidgin|orthograph\w*)\b/i,
  },

  // ────────────────────── SCIENCE & ENGINEERING ──────────────────────
  {
    id: 'science-life-nature',
    subject: 'science',
    label: 'Plants, Animals, Habitats & Life Cycles',
    minBand: 'prek',
    needs: [],
    re: /\b(animal\w*|plant\w*|seed\w*|pollinat\w*|photosynthesis|habitat\w*|ecosystem\w*|food chain|food web|life cycle\w*|metamorphosis|butterfly|frog|insect\w*|mammal\w*|reptile\w*|amphibian\w*|bird\w*|fish|ocean animal|shark|whale|dinosaur\w*|forest|rainforest|desert|arctic|biome\w*|adaptation\w*|hibernat\w*|migrat\w*|fung\w*|mushroom\w*|tree\w*)\b/i,
  },
  {
    id: 'science-human-body',
    subject: 'science',
    label: 'Human Body, Health & Neuroscience',
    minBand: 'prek',
    needs: [],
    re: /\b(human body|five senses|brain|neuron\w*|heart|lungs|digest\w*|skeleton|bones|muscle\w*|immune system|germ\w*|bacteria|virus\w*|vaccine\w*|blood|skin|eyes|ears|teeth|sleep|nutrition|microbiome|organ\w*|nervous system|circulatory|respiratory)\b/i,
  },
  {
    id: 'science-earth-weather',
    subject: 'science',
    label: 'Earth Science, Weather, Geology & Fossils',
    minBand: 'prek',
    needs: [],
    re: /\b(weather|season\w*|rain|snow|cloud\w*|water cycle|rainbow|thunder|lightning|tornado|hurricane|earthquake\w*|volcano\w*|rock cycle|mineral\w*|fossil\w*|erosion|weathering|landform\w*|mountain\w*|river\w*|glacier\w*|ocean\w*|tides|tectonic|plate tectonics|geolog\w*|climate|atmosphere|soil|earth's layers|paleontolog\w*)\b/i,
  },
  {
    id: 'science-space-astronomy',
    subject: 'science',
    label: 'Space, Astronomy & Cosmology',
    minBand: 'prek',
    needs: [],
    re: /\b(solar system|planet\w*|sun|moon|star\w*|constellation\w*|eclipse|galaxy|galaxies|milky way|universe|big bang|black hole\w*|astronaut\w*|rocket\w*|nasa|mars|jupiter|saturn|mercury|venus|neptune|uranus|pluto|comet\w*|asteroid\w*|meteor\w*|orbit\w*|space station|telescope|exoplanet\w*|supernova|dark matter|dark energy|cosmolog\w*|light year|spacetime)\b/i,
  },
  {
    id: 'science-forces-physics',
    subject: 'science',
    label: 'Forces, Motion, Energy & Physics',
    minBand: 'k_2',
    needs: [],
    re: /\b(push and pull|force\w*|motion|gravity|friction|magnet\w*|simple machine\w*|lever|pulley|wheel and axle|inclined plane|energy|kinetic|potential energy|electricity|circuit\w*|battery|light|shadow\w*|mirror\w*|lens|sound wave\w*|vibrat\w*|wave\w*|heat|thermal|thermodynamic\w*|newton|momentum|relativity|quantum|photon\w*|electromagnet\w*|nuclear|fusion|fission|physics|aerodynamic\w*|buoyancy|float|sink)\b/i,
  },
  {
    id: 'science-matter-chemistry',
    subject: 'science',
    label: 'Matter, Materials & Chemistry',
    minBand: 'k_2',
    needs: [],
    re: /\b(states of matter|solid\w*.*liquid\w*|liquid\w*.*gas|melting|freezing|evaporat\w*|condens\w*|mixture\w*|solution\w*|chemical reaction|physical change|atom\w*|molecule\w*|element\w*|periodic table|acid\w*|base\w*|pH|bond\w*.*chemical|covalent|ionic|stoichiometr\w*|organic chemistry|polymer\w*|crystal\w*|chemistry|carbon|oxygen|hydrogen)\b/i,
  },
  {
    id: 'science-biology-genetics',
    subject: 'science',
    label: 'Cells, Genetics & Evolution',
    minBand: 'g3_5',
    needs: ['science-life-nature'],
    re: /\b(cell\w*|mitosis|meiosis|dna|rna|gene\w*|genetic\w*|heredity|trait\w*|mutation\w*|evolution|natural selection|darwin|protein\w*|enzyme\w*|crispr|bacteria|archaea|eukaryot\w*|prokaryot\w*|chromosome\w*|punnett|biolog\w*|taxonomy|species|extinction)\b/i,
  },
  {
    id: 'science-engineering',
    subject: 'science',
    label: 'Engineering, Design & How Things Work',
    minBand: 'k_2',
    needs: [],
    re: /\b(engineer\w*|design process|prototype|bridge\w*|skyscraper|airplane|submarine|engine\w*|motor|gear\w*|robot\w*|invention\w*|inventor\w*|how .* works?|build a|experiment\w*|scientific method|hypothesis|materials science|3d print\w*|solar panel|wind turbine|aerospace)\b/i,
  },

  // ────────────────────── LOGIC, CODING & AI ──────────────────────
  {
    id: 'patterns-coding',
    subject: 'cs-logic',
    label: 'Patterns, Sequencing & Early Coding',
    minBand: 'prek',
    needs: [],
    re: /\b(pattern\w*|sequenc\w*|wonderblocks|go and stop|again!|do-block\w*|do block\w*|coding for kids|block coding|scratch|loop\w*|debug\w*|conditional\w*|if else|what comes next)\b/i,
  },
  {
    id: 'logic-reasoning',
    subject: 'cs-logic',
    label: 'Logic, Classification, Analogies & Puzzles',
    minBand: 'prek',
    needs: [],
    re: /\b(logic|puzzle\w*|riddle\w*|brain teaser|paradox\w*|analog\w*|classif\w*|sorting|sort by|odd one out|same and different|critical thinking|fallac\w*|deduct\w*|induct\w*|boolean|truth table|problem solving|spatial)\b/i,
  },
  {
    id: 'computer-science',
    subject: 'cs-logic',
    label: 'Computer Science, Algorithms & Hardware',
    minBand: 'g6_8',
    needs: ['patterns-coding'],
    re: /\b(computer science|algorithm\w*|data structure\w*|binary|bit\w* and byte\w*|cpu|transistor\w*|logic gate\w*|turing|operating system|compiler|encryption|cryptograph\w*|hashing|internet|packet\w*|tcp|http|database|sorting algorithm|graph algorithm|pathfinding|ray tracing|shader|programming|python|javascript|recursion|big o|complexity)\b/i,
  },
  {
    id: 'ai-machine-learning',
    subject: 'cs-logic',
    label: 'Artificial Intelligence & Machine Learning',
    minBand: 'hs',
    needs: ['computer-science', 'probability-statistics'],
    re: /\b(artificial intelligence|machine learning|neural network\w*|deep learning|backpropagation|gradient descent|transformer\w*|attention mechanism|large language model|llm|reinforcement learning|generative ai|diffusion model|information theory|entropy|computer vision|nlp)\b/i,
  },

  // ────────────────── WORLD, GEOGRAPHY & HISTORY ──────────────────
  {
    id: 'world-geography',
    subject: 'world-history',
    label: 'Geography, Maps, Continents & Communities',
    minBand: 'prek',
    needs: [],
    re: /\b(continent\w*|ocean\w*|map\w* skill|compass|equator|hemisphere|country|countries|capital\w*|united states|50 states|africa|asia|europe|antarctica|australia|south america|north america|rural|suburban|urban|community helper|neighborhood|landmark\w*|geograph\w*|flag\w*|culture\w*|around the world)\b/i,
  },
  {
    id: 'great-stories',
    subject: 'world-history',
    label: 'Great Stories, Big History & Origins',
    minBand: 'k_2',
    needs: [],
    re: /\b(great lesson|great stor\w*|cosmic education|black strip|clock of eras|timeline of life|big history|origin\w* of (the universe|life|humans|writing|numbers)|first living thing|ancient human|human origins|coming of (the universe|life|human)|story of numbers|story of writing|geologic time|history of our world)\b/i,
  },
  {
    id: 'world-history',
    subject: 'world-history',
    label: 'World History, Ancient Civilizations & Civics',
    minBand: 'k_2',
    needs: [],
    re: /\b(ancient egypt|ancient greece|ancient rome|mesopotamia|maya\w*|aztec|inca|medieval|middle ages|renaissance|industrial revolution|silk road|viking\w*|samurai|pyramid\w*|pharaoh|empire\w*|civilization\w*|history of|american revolution|constitution|civil rights|president\w*|explorer\w*|archaeolog\w*|government|democracy|civics|economics|supply and demand|money history|trade)\b/i,
  },

  // ────────────────────── ART, COLOR & MUSIC ──────────────────────
  {
    id: 'colours-sorting',
    subject: 'arts-music',
    label: 'Colors, Mixing & Visual Perception',
    minBand: 'prek',
    needs: [],
    re: /\b(colourblocks|color\w*|colour\w*|primary color|secondary color|color wheel|mixing color|rainbow|shade\w* and tint|light and dark|pattern art)\b/i,
  },
  {
    id: 'music-rhythm',
    subject: 'arts-music',
    label: 'Music, Rhythm, Instruments & Theory',
    minBand: 'prek',
    needs: [],
    re: /\b(music|rhythm|tempo|melody|harmony|chord\w*|scale\w*|octave|pitch|instrument\w*|orchestra|piano|guitar|violin|drum\w*|composer\w*|mozart|beethoven|bach|jazz|music theory|counterpoint|interval\w*|time signature|beat\w*)\b/i,
  },
  {
    id: 'art-design',
    subject: 'arts-music',
    label: 'Art, Drawing, Architecture & Art History',
    minBand: 'k_2',
    needs: [],
    re: /\b(art history|painting\w*|sculptur\w*|artist\w*|van gogh|picasso|da vinci|monet|origami|drawing|perspective|architecture|cathedral|museum|pottery|animation|visual art|impressionism|renaissance art)\b/i,
  },
]

export const CONCEPT_BY_ID = Object.fromEntries(CONCEPT_RULES.map((c) => [c.id, c]))

const BAND_ORDER = Object.fromEntries(LEVEL_BANDS.map((b) => [b.id, b.order]))

export function extractMetadata(title, description, channelCfg) {
  const desc = description || ''
  const scored = []
  for (const rule of CONCEPT_RULES) {
    const titleHit = rule.re.test(title)
    const descHit = !titleHit && desc ? rule.re.test(desc) : false
    if (titleHit || descHit) {
      let score = titleHit ? 3 : 1
      if (rule.subject === channelCfg.primarySubject && !channelCfg.multiSubject) score += 1.5
      if (rule.subject === channelCfg.primarySubject && channelCfg.multiSubject) score += 0.25
      scored.push({ rule, score })
    }
  }

  // Fallback to channel default concepts if title/description didn't hit a specific keyword
  if (!scored.length) {
    for (const cid of channelCfg.defaultConcepts || []) {
      const rule = CONCEPT_BY_ID[cid]
      if (rule) scored.push({ rule, score: 1 })
    }
  }
  if (!scored.length) {
    scored.push({ rule: CONCEPT_BY_ID['logic-reasoning'], score: 0.5 })
  }

  scored.sort((a, b) => b.score - a.score)
  const matched = scored.map((s) => s.rule)

  const concepts = matched.slice(0, 4).map((m) => m.id)
  const subjects = [...new Set(matched.slice(0, 4).map((m) => m.subject))]
  if (!subjects.length && channelCfg.primarySubject) subjects.push(channelCfg.primarySubject)
  const needs = [...new Set(matched.slice(0, 3).flatMap((m) => m.needs))].filter((n) => !concepts.includes(n))

  const levelBand = inferLevelBand(title, desc, concepts, channelCfg)
  return { subjects, concepts, needs, levelBand }
}

export function inferLevelBand(title, description, concepts, channelCfg) {
  let band = null

  // Explicit grade/level markers in title take precedence
  if (/\b(preschool|toddler|pre-k|prek|ages? 2|ages? 3|ages? 4|meet the numbers|meet the letters|meet the shapes|meet the colors)\b/i.test(title)) {
    band = 'prek'
  } else if (/\b(kindergarten|1st grade|first grade|2nd grade|second grade|k-2|early math|cvc word|sight word|digraph|consonant blend)\b/i.test(title)) {
    band = 'k_2'
  } else if (/\b(3rd grade|third grade|4th grade|fourth grade|5th grade|fifth grade|elementary|for kids)\b/i.test(title)) {
    if (channelCfg.defaultBand === 'prek' || channelCfg.defaultBand === 'k_2') {
      band = /\b(3rd grade|4th grade|5th grade|long division|equivalent fraction|area and perimeter|photosynthesis|tectonic|ecosystem)\b/i.test(title)
        ? 'g3_5'
        : channelCfg.defaultBand
    } else {
      band = 'g3_5'
    }
  } else if (/\b(6th grade|7th grade|8th grade|middle school|pre-algebra|pythagorean|ratios? and proportion|integers?|negative numbers?)\b/i.test(title)) {
    band = 'g6_8'
  } else if (/\b(high school|ap |algebra 1|algebra 2|trigonometr\w*|precalculus|organic chemistry|stoichiometry|kinematics|thermodynamics|biology|genetics|sat math)\b/i.test(title)) {
    band = 'hs'
  } else if (
    /\b(calculus|linear algebra|eigenvalue|fourier|differential equation|quantum|general relativity|spacetime|neural network|transformer|backpropagation|group theory|topology|riemann|gödel|godel|number theory|real analysis|measure theory|bayesian|information theory|turing|ray tracing|shader|compiler)\b/i.test(
      title,
    )
  ) {
    band = 'university'
  } else {
    // Start from channel's default band and bump up if a concept clearly demands higher level
    band = channelCfg.defaultBand || 'k_2'
    const chOrder = BAND_ORDER[band] ?? 1
    for (const cid of concepts) {
      const rule = CONCEPT_BY_ID[cid]
      if (!rule) continue
      const rOrder = BAND_ORDER[rule.minBand] ?? 0
      if (rOrder > chOrder) {
        const cap = Math.min(rOrder, chOrder + 2)
        band = LEVEL_BANDS[cap].id
      }
    }
  }

  // Always enforce channel-level band guardrails (so a kids video mentioning "biology" stays k_2/g3_5)
  if (channelCfg.maxBand && BAND_ORDER[band] > BAND_ORDER[channelCfg.maxBand]) {
    band = channelCfg.maxBand
  }
  if (channelCfg.minBand && BAND_ORDER[band] < BAND_ORDER[channelCfg.minBand]) {
    band = channelCfg.minBand
  }

  return band
}
