/**
 * Deep dives: for each rank, a lecture on YouTube that goes further than its
 * explainer can. The first of each list is the one that opens; the others
 * are a tap away. Visual lectures come first (the sign drawn and moving, not
 * a talking head at a board). Where a lecture is longer than the part that
 * matters, `start` and `end` (seconds from the beginning of the video) cut
 * it to that part.
 *
 * The picks come from the research of November 2026 (every video answered as
 * embeddable then); `node scripts/dives.mjs` asks YouTube again.
 */
export interface Dive {
  /** The video's id on YouTube. */
  id: string
  title: string
  /** Whose lecture it is. */
  by: string
  /** The whole video's length in seconds (to say how long the part is). */
  len: number
  start?: number
  end?: number
  /** What this one is for, when a rank's lectures split its signs between them. */
  on?: string
}

const m = (min: number, s = 0) => min * 60 + s
const h = (hr: number, min: number, s = 0) => hr * 3600 + min * 60 + s

/** Lectures used by more than one rank. */
const EULER_GROUPS = { id: 'mvmuCPvRoWQ', title: "Euler's formula with introductory group theory", by: '3Blue1Brown', len: m(24, 28) }
const EVERY_NUMBER = { id: 'IzUw53h12wU', title: 'Defining Every Number Ever', by: 'Another Roof', len: h(1, 20, 16) }
const READ_LOGIC = { id: 'JVjv0CCzHok', title: 'How to Read Logic', by: 'Another Roof', len: m(27, 32) }
const WHAT_IS_A_NUMBER = { id: 'dKtsjQtigag', title: 'What IS a Number? As Explained by a Mathematician', by: 'Another Roof', len: m(43, 9) }
const SET_THEORY = { id: '5ZhNmKb-dqk', title: 'Set Theory | All-in-One Video', by: 'Dr. Will Wood', len: m(29, 23) }
const HOW_TO_COUNT = { id: 'QO9a7h87DbA', title: 'How to Count', by: 'Another Roof', len: m(37, 44) }
const WHAT_COMES_NEXT = { id: '4AuV93LOPcE', title: "Why don't they teach Newton's calculus of 'What comes next?'", by: 'Mathologer', len: m(47, 10) }
const LINEAR_MAPS = { id: 'kYB8IZa5AuE', title: 'Linear transformations and matrices', by: '3Blue1Brown', len: m(10, 58) }
const CENTRAL_LIMIT = { id: 'zeJD6dqJ5lo', title: 'But what is the Central Limit Theorem?', by: '3Blue1Brown', len: m(31, 14) }

export const DIVES: Record<number, Dive[]> = {
  // Stage 1: arithmetic
  1: [
    { id: 'iNdHFP75PpA', title: 'What does "equal" actually mean?', by: 'Dr. Trefor Bazett', len: m(16, 48) },
    { id: 'g2--VL2SkMo', title: 'What Do We Mean By Equality?', by: 'Kevin Buzzard, The Archimedeans', len: h(1, 1, 49), start: 245 },
  ],
  2: [{ id: 'rhhhUAAAh-g', title: 'How to Add', by: 'Another Roof', len: m(46, 24) }, { ...EULER_GROUPS, start: 376 }],
  3: [
    { ...EULER_GROUPS, start: 376 },
    { id: 'FnqrpKiCNuE', title: 'What is Multiplication?', by: 'James Tanton', len: m(25, 7) },
  ],
  4: [
    { ...EVERY_NUMBER, start: 2341, end: 3310 },
    { id: '0hlvhQZIOQw', title: 'Funny Fractions and Ford Circles', by: 'Numberphile', len: m(14, 22) },
  ],
  5: [
    { id: 'DEc03_qsQho', title: 'Why is the Order of Operations the way that it is?', by: 'zhuli', len: m(14, 14) },
    { id: 'y9h1oqv21Vs', title: 'The Order of Operations is Wrong', by: 'minutephysics', len: m(4, 10) },
  ],
  6: [
    { id: 'ZYj4NkeGPdM', title: 'HACKENBUSH: a window to a new world of math', by: 'Owen Maitzen', len: m(57, 2) },
    { id: '5c31C8qT-og', title: "Why Don't We Order The Complex Numbers?", by: 'Wrath of Math', len: m(16, 26) },
  ],
  7: [
    { ...EULER_GROUPS, start: 922 },
    { id: 'sULa9Lc4pck', title: 'Triangle of Power', by: '3Blue1Brown', len: m(7, 42) },
  ],
  8: [
    { id: 'yk6wbvNPZW0', title: 'Visualising irrationality with triangular squares', by: 'Mathologer', len: m(18, 9) },
    { id: 'D6AFxJdJYW4', title: 'Irrational Roots', by: 'Mathologer', len: m(14, 52) },
  ],
  9: [
    { id: 'SDtFBSjNmm0', title: '9.999... really is equal to 10', by: 'Mathologer', len: m(14, 45), on: 'decimals' },
    { id: 'b4l7I9fagu0', title: 'Fractions 21: Percentages', by: 'James Tanton', len: m(11, 56), start: 140, on: 'percent' },
  ],
  // The continued fractions come first: the Taylor series need calculus, which is four stages on.
  10: [
    { id: 'CaasbfdJdJg', title: 'Infinite fractions and the most irrational number', by: 'Mathologer', len: m(13, 29) },
    { id: '3d6DsjIBzJ4', title: 'Taylor series', by: '3Blue1Brown', len: m(22, 19) },
  ],
  11: [
    { id: 'XFDM1ip5HdU', title: 'What does it feel like to invent math?', by: '3Blue1Brown', len: m(15, 7) },
    { id: 'Sgupo9DLMGs', title: 'The Distance Between Numbers', by: 'Numberphile', len: m(21, 33) },
  ],
  // Stage 2: algebra
  12: [
    { id: 'kpCJyQ2usJ4', title: 'The beauty of algebra', by: 'Khan Academy', len: m(10, 7) },
    { id: 'Edewyp87W-Q', title: 'Where do Mathematical Symbols Come From?', by: 'Sarah Hart, Gresham College', len: h(1, 7, 59), start: 2550 },
  ],
  13: [
    { id: 'MHXO86wKeDY', title: 'The simpler quadratic formula', by: '3Blue1Brown', len: m(52, 11), start: 816 },
    { id: 'XKBX0r3J-9Y', title: 'Examples: A Different Way to Solve Quadratic Equations', by: 'Po-Shen Loh', len: m(40, 5), start: 1841 },
  ],
  14: [WHAT_COMES_NEXT, { id: 'pAMgUB51XZA', title: 'Amazing Graphs', by: 'Numberphile', len: m(12, 36) }],
  // The animated one first; the chalkboard lecture is the fuller one.
  15: [
    { id: 'CfW845LNObM', title: 'The other way to visualize derivatives', by: '3Blue1Brown', len: m(14, 26), end: 338 },
    { id: 'dNyLGmiYQY0', title: 'Calculus Revisited, Unit I: Lecture 2', by: 'Herb Gross, MIT OpenCourseWare', len: m(39, 42) },
  ],
  16: [
    { id: 'yBw67Fb31Cs', title: 'Trigonometry fundamentals', by: '3Blue1Brown', len: h(1, 13, 17), start: 794 },
    { id: 'snHKEpCv0Hk', title: 'Beautiful Trigonometry', by: 'Numberphile', len: m(12, 7) },
  ],
  17: [
    { id: 'm2MIpDrF7Es', title: "What's so special about Euler's number e?", by: '3Blue1Brown', len: m(13, 50) },
    { id: 'G0Fa5Zl-Z3c', title: "Why don't they teach simple visual logarithms (and hyperbolic trig)?", by: 'Mathologer', len: m(32, 32), start: 206, end: 1334 },
  ],
  18: [
    { id: 'v_HeaeUUOnc', title: 'How to Take the Factorial of Any Number', by: 'Lines That Connect', len: m(26, 31) },
    { id: '6ofIBoWGc7k', title: 'Big Factorials', by: 'Numberphile', len: m(12, 26) },
  ],
  19: [
    { id: 'vQE6-PLcGwU', title: '700 years of secrets of the Sum of Sums (paradoxical harmonic series)', by: 'Mathologer', len: m(46, 34) },
    { id: 'd-o3eB9sfls', title: 'Why is pi here? And why is it squared? A geometric answer to the Basel problem', by: '3Blue1Brown', len: m(17, 8) },
  ],
  20: [
    { id: '8GPy_UMV-08', title: 'The Wallis product for pi, proved geometrically', by: '3Blue1Brown', len: m(25, 26) },
    { id: 'yPl64xi_ZZA', title: "Euler's real identity NOT e to the i pi = -1", by: 'Mathologer', len: m(17, 16) },
  ],
  21: [
    { id: 'SrU9YDoXE88', title: 'How To Count Past Infinity', by: 'Vsauce', len: m(23, 46) },
    { id: 'qlhoFL0hrWs', title: "Galileo's Paradox of Infinity", by: 'Joel David Hamkins', len: m(34, 16) },
  ],
  // From where the scaling laws begin (its opening is about something else).
  22: [{ id: 'tL9Lw250spc', title: 'Why does every mammal get 1 billion heartbeats in their life?', by: 'Veritasium', len: m(35, 32), start: 189 }],
  // Stage 3: logic and sets
  23: [
    { id: '5NGKbiA04Cw', title: 'An Introduction to Propositional Logic', by: 'Spanning Tree', len: m(10, 31) },
    { id: 'QZwneRb-zqA', title: 'Exploring How Computers Work', by: 'Sebastian Lague', len: m(18, 12), start: 50 },
  ],
  24: [
    { ...READ_LOGIC, start: 388, end: 999 },
    { id: 'hzS3BOwvT4I', title: 'Conditional Logical Statements and the Wason Selection Task', by: 'Mathematical Visual Proofs', len: m(11, 12) },
  ],
  25: [
    { ...READ_LOGIC, start: 999, end: 1586 },
    { id: 'GJpezCUMOxA', title: 'Universal and Existential Quantifiers', by: 'Dr. Trefor Bazett', len: m(9, 31) },
  ],
  26: [
    { ...WHAT_IS_A_NUMBER, start: 938 },
    { id: 'hj9hPx23vz0', title: 'Paradoxes and formal theory (Essence of Set Theory, 8)', by: 'Mirek Olšák', len: m(12, 1) },
  ],
  27: [
    { id: 'ymGt7I4Yn3k', title: "Russell's Paradox - a simple explanation of a profound problem", by: 'Jeffrey Kaplan', len: m(28, 27), start: 165 },
    { id: 'xauCQpnbNAM', title: "Russell's Paradox - A Ripple in the Foundations of Mathematics", by: 'Up and Atom', len: m(14, 15) },
  ],
  28: [
    { ...WHAT_IS_A_NUMBER, start: 1906 },
    { id: 'NHZt8eBKcRA', title: 'What is a Number?', by: 'Numberphile', len: m(11, 20) },
  ],
  29: [
    { ...SET_THEORY, start: 261 },
    { id: 'X56zst79Xjg', title: "Cantor's Infinity Paradox", by: 'Up and Atom', len: m(14, 7) },
  ],
  30: [{ ...SET_THEORY, start: 501, end: 1573 }],
  31: [
    { ...EVERY_NUMBER, start: 1390 },
    { id: '5TkIe60y2GI', title: 'All the Numbers', by: 'Numberphile', len: m(14, 26) },
  ],
  32: [{ ...HOW_TO_COUNT, start: 330, end: 1071 }],
  33: [LINEAR_MAPS, { ...HOW_TO_COUNT, start: 1071 }],
  34: [
    { id: 'lJ3CD9M3nEQ', title: 'Modular Arithmetic Visually Explained', by: 'Zach Star', len: m(20, 33) },
    { id: 'qhbuKbxJsk8', title: 'Times Tables, Mandelbrot and the Heart of Mathematics', by: 'Mathologer', len: m(13, 36) },
  ],
  35: [
    { id: 'VYQVlVoWoPY', title: 'How to lie using visual proofs', by: '3Blue1Brown', len: m(18, 48) },
    { id: 'HeQX2HjkcNo', title: "Math's Fundamental Flaw", by: 'Veritasium', len: m(33, 59) },
  ],
  // Stage 4: calculus
  36: [
    { id: '9vKqVkMQHKk', title: 'The paradox of the derivative', by: '3Blue1Brown', len: m(16, 50) },
    { ...WHAT_COMES_NEXT, start: 316 },
  ],
  37: [
    { id: 'kfF40MiS7zA', title: "Limits, L'Hôpital's rule, and epsilon delta definitions", by: '3Blue1Brown', len: m(18, 26) },
    { id: 'cjeXg5rJ9D8', title: 'Real Analysis, lecture 13: Limits of Functions', by: 'MIT OpenCourseWare', len: h(1, 12, 53), start: 123 },
  ],
  38: [
    { id: 'S0_qX4VJhMQ', title: 'Derivative formulas through geometry', by: '3Blue1Brown', len: m(17, 33) },
    { id: 'kuOxDh3egN0', title: 'Why is calculus so ... EASY ?', by: 'Mathologer', len: m(38, 32), start: 192 },
  ],
  39: [
    { id: 'rfG8ce4nNh0', title: 'Integration and the fundamental theorem of calculus', by: '3Blue1Brown', len: m(20, 46) },
    { id: 'WUvTyaaNkzM', title: 'The essence of calculus', by: '3Blue1Brown', len: m(17, 4) },
  ],
  40: [
    { id: 'AXqhWeUEtQU', title: 'Partial derivatives, introduction', by: 'Grant Sanderson, Khan Academy', len: m(10, 55) },
    { id: 'dfvnCHqzK54', title: 'Partial derivatives and graphs', by: 'Grant Sanderson, Khan Academy', len: m(6, 54) },
    { id: 'ly4S0oi3Yz8', title: 'But what is a partial differential equation?', by: '3Blue1Brown', len: m(17, 39) },
  ],
  // Stage 5: vectors and linear algebra
  41: [
    { id: 'fNk_zzaMoSs', title: 'Vectors', by: '3Blue1Brown', len: m(9, 52) },
    { id: 'TgKwz5Ikpc8', title: 'Abstract vector spaces', by: '3Blue1Brown', len: m(16, 46), start: 139 },
  ],
  42: [
    { id: 'NKuLYRui-NU', title: 'The Lp Norm for Vectors and Functions', by: 'Dr. Will Wood', len: m(9, 34) },
    { id: 'fl5fOAYY-1s', title: 'Weird notions of "distance": Intro to Metric Spaces', by: 'Dr. Trefor Bazett', len: m(12, 31) },
  ],
  43: [
    { id: 'LyGKycYT2v0', title: 'Dot products and duality', by: '3Blue1Brown', len: m(14, 12), on: 'the dot' },
    { id: 'eu6i7WJeinw', title: 'Cross products', by: '3Blue1Brown', len: m(8, 54), on: 'the cross' },
  ],
  44: [
    { ...LINEAR_MAPS, on: 'matrices' },
    { id: 'Ip3X9LOh2dk', title: 'The determinant', by: '3Blue1Brown', len: m(10, 3), on: 'det' },
    { id: 'uQhTuRlWMxw', title: 'Inverse matrices, column space and null space', by: '3Blue1Brown', len: m(12, 9), on: 'the inverse' },
    { id: 'g4ecBFmvAYU', title: 'The deeper meaning of matrix transpose', by: 'Mathemaniac', len: m(25, 41), on: 'the transpose' },
  ],
  45: [
    { id: 'rB83DpBJQsE', title: "Divergence and curl: The language of Maxwell's equations, fluid flow, and more", by: '3Blue1Brown', len: m(15, 42), on: 'divergence and curl' },
    { id: 'TEB2z7ZlRAw', title: 'Why the gradient is the direction of steepest ascent', by: 'Grant Sanderson, Khan Academy', len: m(10, 32), on: 'the gradient' },
  ],
  46: [
    { id: '1Ez1tn1mei8', title: 'The beautiful geometric view of Fourier series: the linear algebra perspective', by: 'Dr. Trefor Bazett', len: m(16, 3) },
    { id: 'g-eNeXlZKAQ', title: 'Inner Products in Hilbert Space', by: 'Steve Brunton', len: m(8, 41) },
  ],
  // Stage 6: probability and statistics
  47: [
    { id: 'HZGCoVF3YvM', title: 'Bayes theorem, the geometry of changing beliefs', by: '3Blue1Brown', len: m(15, 11) },
    { id: 'lG4VkPoG3ko', title: "The medical test paradox, and redesigning Bayes' rule", by: '3Blue1Brown', len: m(21, 13) },
  ],
  // The four animated minutes on mean and spread first; the other is about dividing by n − 1, which the explainer leaves out.
  48: [
    { ...CENTRAL_LIMIT, start: 701, end: 954 },
    { id: '8e9aDMXRRlc', title: "Why n-1? Least Squares and Bessel's Correction", by: 'Sam Levey', len: m(23, 49) },
  ],
  49: [
    { id: 'CBgCR1kHSUI', title: 'The Expected Value (Mean) of a Probability Distribution', by: 'Steve Brunton', len: m(15, 24) },
    { id: '8rnzHE2UtoM', title: 'Properties of the Expected Value', by: 'Steve Brunton', len: m(10, 18) },
    { id: 'LX2q356N2rU', title: 'Statistics 110, lecture 9: Expectation, Indicator Random Variables, Linearity', by: 'Joe Blitzstein, Harvard', len: m(50, 22), start: 862 },
  ],
  50: [CENTRAL_LIMIT, { id: 'cy8r7WSuT1I', title: 'Why π is in the normal distribution (beyond integral tricks)', by: '3Blue1Brown', len: m(24, 45) }],
  // Stage 7: structure
  51: [
    { ...EULER_GROUPS, start: 376 },
    { id: 'mH0oCDa74tE', title: 'Group theory, abstraction, and the 196,883-dimensional monster', by: '3Blue1Brown', len: m(21, 58), start: 616 },
  ],
  52: [
    { id: '5GH1z3K9498', title: 'What are...direct sums?', by: 'VisualMath', len: m(8, 12), on: 'the direct sum' },
    { id: '8ioUzpYxutQ', title: 'What are...tensor products?', by: 'VisualMath', len: m(9, 10), on: 'the tensor product' },
    { id: 'KnSZBjnd_74', title: 'A Concrete Introduction to Tensor Products', by: 'Mu Prime Math', len: m(37, 40) },
  ],
  53: [
    { id: 'EyBDtUtyshk', title: 'Complex integration, Cauchy and residue theorems', by: 'Mathemaniac', len: m(40, 45) },
    { id: 'LqNqqidw2mg', title: "Stokes' Theorem and Green's Theorem", by: 'Steve Brunton', len: m(23, 54) },
  ],
}

export const divesOf = (rank: number): Dive[] => DIVES[rank] ?? []

/** How long the part to watch is, in whole minutes. */
export const minutesOf = (d: Dive) => Math.max(1, Math.round(((d.end ?? d.len) - (d.start ?? 0)) / 60))

/** The player's address: YouTube's cookieless host, with its own controls, no full screen (the app's web view cannot give it), captions on. */
export const embedUrl = (d: Dive, origin: string) => {
  const q = new URLSearchParams({ rel: '0', fs: '0', playsinline: '1', iv_load_policy: '3', cc_load_policy: '1', enablejsapi: '1', origin })
  if (d.start) q.set('start', String(d.start))
  if (d.end) q.set('end', String(d.end))
  return `https://www.youtube-nocookie.com/embed/${d.id}?${q}`
}

/** The same lecture on YouTube itself, for when it will not play here. */
export const watchUrl = (d: Dive) => `https://www.youtube.com/watch?v=${d.id}${d.start ? `&t=${d.start}s` : ''}`
