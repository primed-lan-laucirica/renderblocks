#!/usr/bin/env node
/**
 * Build-time audio asset generator (ElevenLabs).
 *
 * NOT used by the app at runtime — the app ships plain .mp3 files and never
 * talks to any API. Run this by hand when the manifest changes:
 *
 *   node tools/audio/generate.mjs            # only missing files
 *   node tools/audio/generate.mjs --force    # regenerate everything
 *   node tools/audio/generate.mjs --only gifted   # dirs matching a substring
 *
 * The API key is read from ~/.config/elevenlabs/key (or $ELEVENLABS_API_KEY)
 * and is never written into the repo.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')
const OUT_ROOT = join(REPO, 'packages', 'app', 'public', 'games')

const args = process.argv.slice(2)
const force = args.includes('--force')
const onlyIdx = args.indexOf('--only')
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim()
  const f = join(homedir(), '.config', 'elevenlabs', 'key')
  if (!existsSync(f)) {
    console.error('No API key: set $ELEVENLABS_API_KEY or write it to ~/.config/elevenlabs/key')
    process.exit(1)
  }
  const raw = readFileSync(f, 'utf8').trim()
  // Tolerate a pasted `NAME='sk_...'` line as well as a bare key.
  const m = raw.match(/=\s*['"]?([^'"\s]+)['"]?\s*$/)
  return m ? m[1] : raw
}

const KEY = apiKey()
const manifest = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'))

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${text.slice(0, 200)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

function target(dir, name) {
  const p = join(OUT_ROOT, dir, `${name}.mp3`)
  mkdirSync(dirname(p), { recursive: true })
  return p
}

/**
 * Match the existing hand-made assets: 192kbps / 48kHz / stereo, leading
 * silence trimmed, loudness levelled, padded to a fixed length so clips
 * stitch together evenly.
 */
function normalize(path, seconds, { pad = true, endsOnly = false, channels = 2 } = {}) {
  const tmp = `${path}.tmp.mp3`
  // Clips that get STITCHED into phrases must not be padded to a fixed
  // length — the trailing silence stacks up into robotic gaps. Trim both
  // ends instead and let them run back to back.
  const trimBoth =
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02:' +
    'stop_periods=-1:stop_threshold=-45dB:stop_silence=0.06'
  // Sustained sounds (a long scream) keep their inner pauses: trim only the
  // leading and trailing silence, so the clip keeps the length it was made for.
  const trimEnds =
    'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03,areverse,' +
    'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse'
  try {
    execFileSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', path,
      '-af',
      pad
        ? 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03,' +
          'loudnorm=I=-16:TP=-1.5:LRA=11,apad'
        : `${endsOnly ? trimEnds : trimBoth},loudnorm=I=-16:TP=-1.5:LRA=11`,
      ...(pad ? ['-t', String(seconds)] : []),
      '-ar', '48000', '-ac', String(channels), '-b:a', channels === 1 ? '128k' : '192k',
      tmp,
    ])
    writeFileSync(path, readFileSync(tmp))
    unlinkSync(tmp)
  } catch (e) {
    console.warn(`  (ffmpeg normalize skipped for ${path}: ${e.message.split('\n')[0]})`)
  }
}

/**
 * The children's-chorus voice used for app OUTPUT is produced with the
 * SOUND-EFFECTS endpoint, not text-to-speech: the prompt asks for a group of
 * kids saying the word. (Voice *design* of a child voice is blocked by
 * ElevenLabs policy; this is a one-off sound, which they allow.)
 */
function chorusPrompt(word) {
  // Lan's original February prompt, which produced the existing assets.
  // Deliberately terse — elaborate staging prompts drift in character.
  return `a child's voice saying "${word}"`
}

let made = 0
let skipped = 0

for (const group of manifest.speech ?? []) {
  if (only && !group.dir.includes(only)) continue
  for (const [name, text] of Object.entries(group.items)) {
    const path = target(group.dir, name)
    if (existsSync(path) && !force) { skipped++; continue }
    const v = manifest.voice
    const buf = await post(
      `https://api.elevenlabs.io/v1/text-to-speech/${v.id}`,
      { text, model_id: v.model, voice_settings: v.settings },
    )
    writeFileSync(path, buf)
    console.log(`speech  ${group.dir}/${name}.mp3  ${(buf.length / 1024).toFixed(0)}kB  "${text}"`)
    made++
  }
}

for (const group of manifest.chorus ?? []) {
  if (only && !group.dir.includes(only)) continue
  const seconds = group.seconds ?? 1.032
  // An item is either a bare word or { text, seconds } for a whole phrase.
  for (const [name, spec] of Object.entries(group.items)) {
    const word = typeof spec === 'string' ? spec : spec.text
    const dur = typeof spec === 'string' ? seconds : spec.seconds
    const path = target(group.dir, name)
    if (existsSync(path) && !force) { skipped++; continue }
    const buf = await post('https://api.elevenlabs.io/v1/sound-generation', {
      text: chorusPrompt(word),
      duration_seconds: Math.min(30, Math.max(0.5, dur)),
      prompt_influence: group.influence ?? 0.9,
    })
    writeFileSync(path, buf)
    normalize(path, dur, { pad: group.pad !== false })
    console.log(`chorus  ${group.dir}/${name}.mp3  ${(readFileSync(path).length / 1024).toFixed(0)}kB  "${word}"`)
    made++
  }
}

for (const group of manifest.sfx ?? []) {
  if (only && !group.dir.includes(only)) continue
  for (const [name, spec] of Object.entries(group.items)) {
    const path = target(group.dir, name)
    if (existsSync(path) && !force) { skipped++; continue }
    const buf = await post('https://api.elevenlabs.io/v1/sound-generation', {
      text: spec.prompt,
      // API accepts 0.5-30s; clamp so a manifest typo can't fail the run.
      duration_seconds: Math.min(30, Math.max(0.5, spec.seconds)),
      prompt_influence: spec.influence ?? 0.6,
    })
    writeFileSync(path, buf)
    // Voice-like effects (e.g. LavaBlocks' falling screams) are levelled like the chorus clips.
    if (group.normalize) normalize(path, spec.seconds, { pad: false, endsOnly: true, channels: group.channels ?? 2 })
    console.log(`sfx     ${group.dir}/${name}.mp3  ${(readFileSync(path).length / 1024).toFixed(0)}kB`)
    made++
  }
}

console.log(`\ndone — ${made} generated, ${skipped} already present (use --force to redo)`)
