import { p, smooth } from '../engine/ease'

/** The whole scene's fade: in after the title, out at the very end. */
export const sceneAlpha = (t: number, end: number) => smooth(p(t, 2.6, 3.2)) * (1 - smooth(p(t, end - 1.2, end)))
