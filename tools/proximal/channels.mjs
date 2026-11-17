/**
 * Proximal Research Channel Registry
 *
 * Tier 0 ("seed"): User-specified reference anchors defining the target pedagogical
 * & aesthetic space (Numberblocks, Wonderblocks, Preschool Prep / Primary School Prep
 * math & math facts, Homeschool Pop math topics).
 *
 * Tier 1 ("candidate"): Approved expansion rings mined and scored against the
 * seed reference videos via neural embeddings (BAAI/bge-small-en-v1.5).
 */

export const SEED_ANCHORS = [
  {
    id: 'numberblocks',
    label: 'Numberblocks',
    color: '#EF4444',
    summary: 'Visual block-model number sense, counting, operations, squares, arrays & patterns',
  },
  {
    id: 'wonderblocks',
    label: 'Wonderblocks',
    color: '#8B5CF6',
    summary: 'Step-by-step sequences, loops (Again), patterns, debugging & computational thinking',
  },
  {
    id: 'preschool-prep',
    label: 'Preschool & Primary Prep',
    color: '#F59E0B',
    summary: 'Calm direct mastery of numbers, shapes, math facts (+, −, ×, ÷) & primary math',
  },
  {
    id: 'homeschool-pop',
    label: 'Homeschool Pop Math',
    color: '#0EA5E9',
    summary: 'Friendly classroom-style K–5 concept lessons: place value, fractions, time, money & geometry',
  },
]

export const CHANNEL_GROUPS = [
  { id: 'seed', label: 'Reference Seeds', color: '#EC4899' },
  { id: 'structured_k5', label: 'Structured K–5 Math', color: '#0284C7' },
  { id: 'visual_story', label: 'Visual Story & Pattern Math', color: '#7C3AED' },
  { id: 'fluency_songs', label: 'Math Facts & Fluency Songs', color: '#16A34A' },
  { id: 'learningblocks_siblings', label: 'Learning Blocks Universe', color: '#EA580C' },
  { id: 'symbols_bridge', label: 'Upper Math Horizon', color: '#CA8A04' },
]

export const CHANNELS = [
  // ───────────────────────── TIER 0: REFERENCE SEEDS ─────────────────────────
  {
    id: 'numberblocks',
    name: 'Numberblocks',
    handle: '@Numberblocks',
    channelId: 'UCPlwvN0w4qFSP1FllALB92w',
    role: 'seed',
    seedAnchor: 'numberblocks',
    group: 'seed',
    defaultStage: 'preschool',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/channel/UCPlwvN0w4qFSP1FllALB92w/videos', limit: 140 },
      { kind: 'search', query: 'Numberblocks full episode counting addition subtraction', limit: 35 },
      { kind: 'search', query: 'Numberblocks multiplication times tables squares arrays', limit: 35 },
      { kind: 'search', query: 'Numberblocks numbers 1 to 20 100 place value', limit: 30 },
    ],
  },
  {
    id: 'wonderblocks',
    name: 'Wonderblocks',
    handle: '@WonderblocksOfficial',
    channelId: 'UCfn38Gen7fZgkWN1yLUK6iw',
    role: 'seed',
    seedAnchor: 'wonderblocks',
    group: 'seed',
    defaultStage: 'preschool',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/channel/UCfn38Gen7fZgkWN1yLUK6iw/videos', limit: 120 },
      { kind: 'search', query: 'Wonderblocks coding pattern sequence full episode', limit: 25 },
    ],
  },
  {
    id: 'preschool-prep',
    name: 'Preschool Prep Company',
    handle: '@PreschoolPrep',
    channelId: 'UC47Uh7XWApFNpCqQ80e61ug',
    role: 'seed',
    seedAnchor: 'preschool-prep',
    group: 'seed',
    defaultStage: 'preschool',
    topicFilter: 'preschool_prep_math',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/channel/UC47Uh7XWApFNpCqQ80e61ug/videos', limit: 220 },
      { kind: 'search', query: 'Preschool Prep Company Meet the Numbers Shapes', limit: 35 },
      { kind: 'search', query: 'Preschool Prep Company Meet the Math Facts Addition Subtraction', limit: 40 },
      { kind: 'search', query: 'Preschool Prep Company Meet the Math Facts Multiplication Division Drills', limit: 40 },
      { kind: 'search', query: 'Primary School Prep Preschool Prep math', limit: 25 },
    ],
  },
  {
    id: 'homeschool-pop',
    name: 'Homeschool Pop',
    handle: '@HomeschoolPop',
    channelId: 'UCfPyVJEBD7Di1YYjTdS2v8g',
    role: 'seed',
    seedAnchor: 'homeschool-pop',
    group: 'seed',
    defaultStage: 'primary',
    topicFilter: 'math_strict',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/channel/UCfPyVJEBD7Di1YYjTdS2v8g/videos', limit: 200 },
      { kind: 'search', query: 'Homeschool Pop math addition subtraction counting place value', limit: 40 },
      { kind: 'search', query: 'Homeschool Pop math multiplication division fractions arrays', limit: 40 },
      { kind: 'search', query: 'Homeschool Pop math telling time coins money measurement shapes geometry', limit: 40 },
      { kind: 'search', query: 'Homeschool Pop Roman numerals tally marks bar graphs even odd greater than', limit: 30 },
    ],
  },

  // ─────────────── TIER 1A: LEARNING BLOCKS UNIVERSE SIBLINGS ───────────────
  {
    id: 'alphablocks',
    name: 'Alphablocks',
    handle: '@Alphablocks',
    channelId: 'UC_qs3c0ehDvZkbiEbOj6Drg',
    role: 'candidate',
    group: 'learningblocks_siblings',
    defaultStage: 'preschool',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/channel/UC_qs3c0ehDvZkbiEbOj6Drg/videos', limit: 70 },
    ],
  },
  {
    id: 'colourblocks',
    name: 'Colourblocks',
    handle: '@Colourblocks',
    channelId: null,
    expectedChannelMatch: /colourblocks/i,
    role: 'candidate',
    group: 'learningblocks_siblings',
    defaultStage: 'preschool',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/@Colourblocks/videos', limit: 70 },
    ],
  },
  {
    id: 'blocks-universe',
    name: 'Blocks Universe',
    handle: '@BlocksUniverse',
    channelId: 'UCpbpfcZfo-hoDAx2m1blFhg',
    role: 'candidate',
    group: 'learningblocks_siblings',
    defaultStage: 'preschool',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/channel/UCpbpfcZfo-hoDAx2m1blFhg/videos', limit: 60 },
    ],
  },

  // ──────────────── TIER 1B: VISUAL STORY & PATTERN MATH ────────────────
  {
    id: 'scratch-garden',
    name: 'Scratch Garden',
    handle: '@ScratchGarden',
    channelId: null,
    expectedChannelMatch: /scratch garden/i,
    role: 'candidate',
    group: 'visual_story',
    defaultStage: 'primary',
    topicFilter: 'math_logic',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/@ScratchGarden/videos', limit: 160 },
      { kind: 'search', query: 'Scratch Garden Mini Math Movies counting addition subtraction fractions', limit: 40 },
      { kind: 'search', query: 'Scratch Garden skip counting coding patterns shapes measurement', limit: 40 },
    ],
  },
  {
    id: 'numberjacks',
    name: 'Numberjacks',
    handle: '@Numberjacks',
    channelId: 'UCWKuiktSh-V3E4ysPU0VC3Q',
    role: 'candidate',
    group: 'visual_story',
    defaultStage: 'preschool',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/channel/UCWKuiktSh-V3E4ysPU0VC3Q/videos', limit: 90 },
    ],
  },
  {
    id: 'odd-squad',
    name: 'Odd Squad',
    handle: '@OddSquadOfficial',
    channelId: null,
    expectedChannelMatch: /odd squad|pbs kids/i,
    role: 'candidate',
    group: 'visual_story',
    defaultStage: 'primary',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/@OddSquadOfficial/videos', limit: 80 },
      { kind: 'search', query: 'Odd Squad math numbers patterns PBS', limit: 35 },
    ],
  },
  {
    id: 'pbs-kids-math',
    name: 'PBS KIDS Math (Peg + Cat & Cyberchase)',
    handle: '@PBSKIDS',
    channelId: 'UCrNnk0wFBnCS1awGjq_ijGQ',
    role: 'candidate',
    group: 'visual_story',
    defaultStage: 'preschool',
    topicFilter: 'math_logic',
    sources: [
      { kind: 'search', query: 'PBS KIDS PEG + CAT math numbers shapes counting', limit: 40 },
      { kind: 'search', query: 'PBS KIDS Cyberchase math fractions patterns geometry', limit: 30 },
    ],
  },

  // ─────────────── TIER 1C: CALM STRUCTURED K–5 INSTRUCTION ───────────────
  {
    id: 'khan-kids',
    name: 'Khan Academy Kids',
    handle: '@KhanAcademyKids',
    channelId: null,
    expectedChannelMatch: /khan academy kids/i,
    role: 'candidate',
    group: 'structured_k5',
    defaultStage: 'preschool',
    topicFilter: 'math_logic',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/@KhanAcademyKids/videos', limit: 140 },
      { kind: 'search', query: 'Khan Academy Kids math counting numbers shapes patterns logic', limit: 40 },
    ],
  },
  {
    id: 'khan-math',
    name: 'Khan Academy (Early & Elementary Math)',
    handle: '@khanacademy',
    channelId: null,
    expectedChannelMatch: /^khan academy$/i,
    role: 'candidate',
    group: 'structured_k5',
    defaultStage: 'primary',
    topicFilter: 'math_strict',
    sources: [
      { kind: 'search', query: 'Khan Academy Early Math counting place value addition subtraction within 20 100', limit: 45 },
      { kind: 'search', query: 'Khan Academy 1st 2nd 3rd grade math multiplication division fractions number line', limit: 45 },
      { kind: 'search', query: 'Khan Academy elementary math geometry area perimeter measurement telling time', limit: 35 },
    ],
  },
  {
    id: 'matholia',
    name: 'Matholia (Singapore Math)',
    handle: '@MatholiaChannel',
    channelId: null,
    expectedChannelMatch: /matholia/i,
    role: 'candidate',
    group: 'structured_k5',
    defaultStage: 'primary',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/@MatholiaChannel/videos', limit: 120 },
      { kind: 'search', query: 'Matholia Singapore Math bar model number bonds place value addition subtraction', limit: 35 },
    ],
  },
  {
    id: 'smile-and-learn',
    name: 'Smile and Learn - English',
    handle: '@SmileandLearnEnglish',
    channelId: 'UCxoDMG0tvaYO5Xobvtqw5nw',
    role: 'candidate',
    group: 'structured_k5',
    defaultStage: 'primary',
    topicFilter: 'math_strict',
    sources: [
      { kind: 'search', query: 'Smile and Learn English math for kids addition subtraction multiplication division', limit: 40 },
      { kind: 'search', query: 'Smile and Learn English fractions geometry shapes telling time numbers counting', limit: 40 },
    ],
  },
  {
    id: 'kids-academy',
    name: 'Kids Academy',
    handle: '@KidsAcademyCompany',
    channelId: null,
    expectedChannelMatch: /kids academy/i,
    role: 'candidate',
    group: 'structured_k5',
    defaultStage: 'preschool',
    topicFilter: 'math_logic',
    sources: [
      { kind: 'search', query: 'Kids Academy math preschool kindergarten 1st grade counting addition subtraction', limit: 45 },
      { kind: 'search', query: 'Kids Academy place value geometry shapes telling time sorting logic', limit: 35 },
    ],
  },
  {
    id: 'lets-do-math',
    name: "Let's Do Math",
    handle: '@LetsDoMath',
    channelId: null,
    expectedChannelMatch: /let'?s do math/i,
    role: 'candidate',
    group: 'structured_k5',
    defaultStage: 'elementary',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/@LetsDoMath/videos', limit: 110 },
    ],
  },
  {
    id: 'math-antics',
    name: 'Math Antics',
    handle: '@mathantics',
    channelId: null,
    expectedChannelMatch: /math antics/i,
    role: 'candidate',
    group: 'structured_k5',
    defaultStage: 'elementary',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/@mathantics/videos', limit: 100 },
    ],
  },
  {
    id: 'mashup-math',
    name: 'Mashup Math',
    handle: '@MashupMath',
    channelId: null,
    expectedChannelMatch: /mashup math/i,
    role: 'candidate',
    group: 'structured_k5',
    defaultStage: 'elementary',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/@MashupMath/videos', limit: 90 },
    ],
  },

  // ─────────────── TIER 1D: MATH-FACT & SKIP-COUNTING FLUENCY ───────────────
  {
    id: 'numberock',
    name: 'Numberock',
    handle: '@Numberock',
    channelId: 'UCt9SZgFExNwWTH5T_JnyF-A',
    role: 'candidate',
    group: 'fluency_songs',
    defaultStage: 'primary',
    topicFilter: 'all_clean',
    sources: [
      { kind: 'tab', url: 'https://www.youtube.com/channel/UCt9SZgFExNwWTH5T_JnyF-A/videos', limit: 130 },
    ],
  },
  {
    id: 'jack-hartmann',
    name: 'Jack Hartmann Kids Music Channel',
    handle: '@JackHartmann',
    channelId: null,
    expectedChannelMatch: /jack hartmann/i,
    role: 'candidate',
    group: 'fluency_songs',
    defaultStage: 'preschool',
    topicFilter: 'math_strict',
    sources: [
      { kind: 'search', query: 'Jack Hartmann subitize ten frame number bonds counting to 100', limit: 40 },
      { kind: 'search', query: 'Jack Hartmann skip counting by 2 3 4 5 10 math facts addition subtraction multiplication', limit: 45 },
    ],
  },
]
