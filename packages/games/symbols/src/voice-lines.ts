/** Every line the voice script has to make: each explainer's narration, and the Bench's few words. */
import { SPECS } from './explainers/specs'
import { BENCH_LINES } from './bench/lines'

export const LINES: string[] = [...new Set([...SPECS.flatMap((s) => s.steps.flatMap((st) => (st.say ? [st.say] : []))), ...BENCH_LINES])]
