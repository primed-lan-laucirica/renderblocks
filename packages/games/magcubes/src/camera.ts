/**
 * The 3D view (spec: the view orb). An orthographic camera: a rotation R
 * takes world directions to view directions, and the view is drawn flat.
 *
 * World: x right, y toward the viewer at home, z up. View: X right, Y down
 * the screen, Z toward the viewer. Both are the same handedness, so R is a
 * plain rotation, and at R = identity you look straight down on the table.
 */

export type Vec3 = [number, number, number]
/** 3×3 matrix, row-major. */
export type Mat3 = number[]

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const norm = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1))

export function mul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array<number>(9)
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j]
  return r
}

export const apply = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
]

export const transpose = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]

/** Rotation by `angle` about `axis` (Rodrigues): v → v cos + (k × v) sin + k (k·v)(1 − cos). */
export function rotation(axis: Vec3, angle: number): Mat3 {
  const [x, y, z] = norm(axis)
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const t = 1 - c
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c]
}

/** Undo floating-point drift after many small turns: re-square the rows. */
export function orthonormalize(m: Mat3): Mat3 {
  const a = norm([m[0], m[1], m[2]])
  let b: Vec3 = [m[3], m[4], m[5]]
  b = norm(sub(b, scale(a, dot(a, b))))
  const c = cross(a, b)
  return [...a, ...b, ...c]
}

/** Axis and angle of a rotation matrix. */
export function axisAngle(m: Mat3): { axis: Vec3; angle: number } {
  const angle = Math.acos(Math.max(-1, Math.min(1, (m[0] + m[4] + m[8] - 1) / 2)))
  const s = Math.sin(angle)
  if (s > 1e-4) return { axis: norm([(m[7] - m[5]) / (2 * s), (m[2] - m[6]) / (2 * s), (m[3] - m[1]) / (2 * s)]), angle }
  if (angle < 0.5) return { axis: [0, 0, 1], angle: 0 }
  // Half a turn: m = 2kkᵀ − I, so read k off its largest diagonal entry.
  const d = [(m[0] + 1) / 2, (m[4] + 1) / 2, (m[8] + 1) / 2]
  const i = d[0] >= d[1] && d[0] >= d[2] ? 0 : d[1] >= d[2] ? 1 : 2
  const ki = Math.sqrt(Math.max(d[i], 1e-12))
  const k: Vec3 = [0, 0, 0]
  for (let j = 0; j < 3; j++) k[j] = j === i ? ki : m[3 * i + j] / (2 * ki)
  return { axis: norm(k), angle }
}

/**
 * Home: looking down from in front, 60° above the table (tops 0.87 deep,
 * fronts 0.5 tall), and a little from the right (12°) so right faces show.
 */
export const HOME: Mat3 = mul(rotation([1, 0, 0], Math.PI / 6), rotation([0, 0, 1], (12 * Math.PI) / 180))

export interface Camera {
  R: Mat3
  /** World point the camera looks at, and turns about. */
  T: Vec3
  /** Screen offset of that point from the canvas centre, CSS px. */
  ox: number
  oy: number
  /** Pixels per cube. */
  zoom: number
  w: number
  h: number
}

/** Screen position (and depth: larger is nearer the viewer) of a world point. */
export function project(c: Camera, p: Vec3): { x: number; y: number; z: number } {
  const v = apply(c.R, sub(p, c.T))
  return { x: v[0] * c.zoom + c.w / 2 + c.ox, y: v[1] * c.zoom + c.h / 2 + c.oy, z: v[2] }
}

/** The line of sight through a screen point: from in front of everything, into the screen. */
export function ray(c: Camera, sx: number, sy: number): { o: Vec3; d: Vec3 } {
  const Rt = transpose(c.R)
  const vx = (sx - c.w / 2 - c.ox) / c.zoom
  const vy = (sy - c.h / 2 - c.oy) / c.zoom
  return { o: add(c.T, apply(Rt, [vx, vy, 1e4])), d: apply(Rt, [0, 0, -1]) }
}

/** Where a ray first enters the unit cube at `min`, and through which face (its outward normal). */
export function rayCube(o: Vec3, d: Vec3, min: Vec3): { t: number; normal: Vec3 } | null {
  let t0 = -Infinity
  let t1 = Infinity
  let axis = 0
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (o[i] < min[i] || o[i] > min[i] + 1) return null
      continue
    }
    let a = (min[i] - o[i]) / d[i]
    let b = (min[i] + 1 - o[i]) / d[i]
    if (a > b) [a, b] = [b, a]
    if (a > t0) {
      t0 = a
      axis = i
    }
    t1 = Math.min(t1, b)
    if (t0 > t1) return null
  }
  if (t1 < 0) return null
  const normal: Vec3 = [0, 0, 0]
  normal[axis] = d[axis] > 0 ? -1 : 1
  return { t: t0, normal }
}
