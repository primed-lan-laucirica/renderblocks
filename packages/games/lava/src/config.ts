/** Every tunable in one place (spec 9). The parent panel edits these live. */
export interface LavaConfig {
  gravity: number
  restitution: number
  friction: number
  density: number
  linearDamping: number
  angularDamping: number
  dragStrength: 'gentle' | 'whip'
  gentleOmega: number
  gentleZeta: number
  whipOmega: number
  whipZeta: number
  /** Drag spring acceleration cap, in block sizes (L) per s². */
  dragAccelMax: number
  /** A fling rises at most this many block sizes. */
  flingApex: number
  /** Release speed cap, in block sizes per second. */
  flingSpeed: number
  /** Release spin cap, rad/s. */
  maxSpin: number
  /** Share of screen height the block nearest the centre fills. */
  cameraFill: number
  /** Camera smoothing time constant, seconds. */
  cameraTau: number
  /** Air gap between the platform and the lava, in heights of the battle's tallest block. */
  lavaDrop: number
  blockCap: number
  debug: boolean
}

export const DEFAULTS: LavaConfig = {
  gravity: 4,
  restitution: 0.08,
  friction: 0.4,
  density: 1,
  linearDamping: 0.05,
  angularDamping: 0.3,
  dragStrength: 'gentle',
  gentleOmega: 8,
  gentleZeta: 0.7,
  whipOmega: 20,
  whipZeta: 0.5,
  dragAccelMax: 40,
  flingApex: 1.5,
  flingSpeed: 6,
  maxSpin: 8,
  cameraFill: 0.45,
  cameraTau: 0.25,
  lavaDrop: 1,
  blockCap: 60,
  debug: false,
}

/** Numeric sliders for the parent panel: [key, label, min, max, step]. */
export const SLIDERS: Array<[keyof LavaConfig, string, number, number, number]> = [
  ['gravity', 'Gravity', 1, 20, 0.5],
  ['restitution', 'Bounce', 0, 0.8, 0.02],
  ['friction', 'Friction', 0, 1.5, 0.05],
  ['linearDamping', 'Air drag', 0, 2, 0.05],
  ['angularDamping', 'Spin drag', 0, 3, 0.1],
  ['gentleOmega', 'Gentle ω', 2, 30, 1],
  ['gentleZeta', 'Gentle ζ', 0.1, 1.5, 0.05],
  ['whipOmega', 'Whip ω', 5, 40, 1],
  ['whipZeta', 'Whip ζ', 0.1, 1.5, 0.05],
  ['dragAccelMax', 'Drag force cap (L/s²)', 5, 200, 5],
  ['flingApex', 'Fling height (L)', 0.5, 8, 0.25],
  ['flingSpeed', 'Fling speed (L/s)', 1, 30, 0.5],
  ['maxSpin', 'Fling spin (rad/s)', 1, 30, 1],
  ['cameraFill', 'Camera fill', 0.15, 0.8, 0.05],
  ['cameraTau', 'Camera smoothing (s)', 0.05, 1.5, 0.05],
  ['lavaDrop', 'Lava drop (× tallest block, next battle)', 0.3, 3, 0.1],
  ['blockCap', 'Block cap (next battle)', 10, 60, 1],
]

const KEY = 'config'

export function loadConfig(get: (key: string) => string | null): LavaConfig {
  try {
    const saved = JSON.parse(get(KEY) ?? '{}') as Partial<LavaConfig>
    return { ...DEFAULTS, ...saved }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveConfig(set: (key: string, value: string) => void, config: LavaConfig): void {
  set(KEY, JSON.stringify(config))
}
