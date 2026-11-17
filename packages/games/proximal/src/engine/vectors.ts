/**
 * On-device 64-D int8 quantized vector index for sub-millisecond semantic similarity,
 * multi-video taste centroids, and semantic query expansion.
 */
import type { ProximalCatalog } from '../types'

export interface VectorIndex {
  dim: number
  count: number
  /** Normalized Float32 vectors [count * dim] */
  matrix: Float32Array
  /** Map from video id -> row index in matrix */
  idToRow: Map<string, number>
  /** Map from prototype token -> normalized Float32Array[dim] */
  protos: Map<string, Float32Array>
}

function decodeB64Int8ToFloat32(b64: string, dim: number): Float32Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const out = new Float32Array(bytes.length)
  const rows = Math.floor(bytes.length / dim)
  for (let r = 0; r < rows; r++) {
    const base = r * dim
    let normSq = 0
    for (let d = 0; d < dim; d++) {
      const signed = bytes[base + d] > 127 ? bytes[base + d] - 256 : bytes[base + d]
      out[base + d] = signed
      normSq += signed * signed
    }
    const inv = normSq > 0 ? 1 / Math.sqrt(normSq) : 1
    for (let d = 0; d < dim; d++) out[base + d] *= inv
  }
  return out
}

let cachedCatalog: ProximalCatalog | null = null
let cachedIndex: VectorIndex | null = null

export function getVectorIndex(catalog: ProximalCatalog): VectorIndex | null {
  if (!catalog.vectorsB64 || !catalog.vecDim) return null
  if (cachedCatalog === catalog && cachedIndex) return cachedIndex

  const dim = catalog.vecDim
  const matrix = decodeB64Int8ToFloat32(catalog.vectorsB64, dim)
  const idToRow = new Map<string, number>()
  catalog.videos.forEach((v, idx) => idToRow.set(v.id, idx))

  const protos = new Map<string, Float32Array>()
  if (catalog.queryProtos) {
    for (const [key, b64] of Object.entries(catalog.queryProtos)) {
      protos.set(key, decodeB64Int8ToFloat32(b64, dim))
    }
  }

  cachedCatalog = catalog
  cachedIndex = { dim, count: catalog.videos.length, matrix, idToRow, protos }
  return cachedIndex
}

/** Dot-product cosine similarity between row `rowA` and a unit query vector `qVec`. */
export function dotRow(index: VectorIndex, row: number, qVec: Float32Array): number {
  const { dim, matrix } = index
  const base = row * dim
  let sum = 0
  for (let d = 0; d < dim; d++) sum += matrix[base + d] * qVec[d]
  return sum
}

/** Builds a unit-length centroid vector from a list of video IDs (with optional weights). */
export function buildVideoCentroid(index: VectorIndex, ids: readonly string[], weights?: readonly number[]): Float32Array | null {
  const { dim, matrix, idToRow } = index
  const acc = new Float32Array(dim)
  let used = 0
  for (let i = 0; i < ids.length; i++) {
    const row = idToRow.get(ids[i])
    if (row === undefined) continue
    const w = weights ? weights[i] : 1
    const base = row * dim
    for (let d = 0; d < dim; d++) acc[d] += matrix[base + d] * w
    used++
  }
  if (used === 0) return null
  let normSq = 0
  for (let d = 0; d < dim; d++) normSq += acc[d] * acc[d]
  if (normSq === 0) return null
  const inv = 1 / Math.sqrt(normSq)
  for (let d = 0; d < dim; d++) acc[d] *= inv
  return acc
}

/** Builds a semantic query vector by blending matching prototype vectors for query tokens. */
export function buildQueryVector(index: VectorIndex, tokens: readonly string[]): Float32Array | null {
  const { dim, protos } = index
  const acc = new Float32Array(dim)
  let hits = 0

  for (const tok of tokens) {
    if (tok.length < 3) continue
    for (const [key, vec] of protos) {
      let weight = 0
      if (key === tok) weight = 1.0
      else if (key.startsWith(tok) || tok.startsWith(key)) weight = 0.75
      if (weight > 0) {
        for (let d = 0; d < dim; d++) acc[d] += vec[d] * weight
        hits++
      }
    }
  }
  if (hits === 0) return null
  let normSq = 0
  for (let d = 0; d < dim; d++) normSq += acc[d] * acc[d]
  if (normSq === 0) return null
  const inv = 1 / Math.sqrt(normSq)
  for (let d = 0; d < dim; d++) acc[d] *= inv
  return acc
}
