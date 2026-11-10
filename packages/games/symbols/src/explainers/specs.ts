/** Every explainer's spec, in rank order (no clips needed: the voice script reads these). */
import type { Spec } from '../engine/spec'
import { r01 } from './r01-equals'
import { r02 } from './r02-plus-minus'
import { r03 } from './r03-times'
import { r04 } from './r04-divide'
import { r05 } from './r05-brackets'
import { r06 } from './r06-compare'
import { r07 } from './r07-powers'
import { r08 } from './r08-roots'
import { r09 } from './r09-point-percent'
import { r10 } from './r10-approx'
import { r11 } from './r11-absolute'

export const SPECS: Spec[] = [r01, r02, r03, r04, r05, r06, r07, r08, r09, r10, r11]
