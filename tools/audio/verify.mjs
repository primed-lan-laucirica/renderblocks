#!/usr/bin/env node
/**
 * Build-time check that generated voice clips actually say their words.
 * Transcribes each clip in a manifest sfx group with ElevenLabs
 * speech-to-text and matches it against the item's `expect` pattern.
 * Writes <dir>/index.json listing ONLY the clips that passed, with their
 * real durations — the app reads that index, so a bad clip never plays.
 *
 *   node tools/audio/verify.mjs lava/voice
 *   node tools/audio/verify.mjs lava/voice --skip-stt   # index every clip, unchecked
 *
 * Like generate.mjs, never used at runtime; the key stays in
 * ~/.config/elevenlabs/key (or $ELEVENLABS_API_KEY).
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_ROOT = join(HERE, '..', '..', 'packages', 'app', 'public', 'games')
const dir = process.argv[2]
const skipStt = process.argv.includes('--skip-stt')
if (!dir) {
  console.error('usage: node tools/audio/verify.mjs <dir>')
  process.exit(1)
}

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim()
  const raw = readFileSync(join(homedir(), '.config', 'elevenlabs', 'key'), 'utf8').trim()
  const m = raw.match(/=\s*['"]?([^'"\s]+)['"]?\s*$/)
  return m ? m[1] : raw
}
const KEY = apiKey()

const manifest = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'))
const group = (manifest.sfx ?? []).find((g) => g.dir === dir)
if (!group) {
  console.error(`no sfx group with dir "${dir}"`)
  process.exit(1)
}

async function transcribe(path) {
  const form = new FormData()
  form.append('model_id', 'scribe_v1')
  form.append('tag_audio_events', 'false')
  form.append('file', new Blob([readFileSync(path)], { type: 'audio/mpeg' }), 'clip.mp3')
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': KEY },
    body: form,
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).text ?? ''
}

const duration = (path) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).toString())

const passed = []
const failed = []
for (const [name, spec] of Object.entries(group.items)) {
  const path = join(OUT_ROOT, dir, `${name}.mp3`)
  if (!existsSync(path)) {
    failed.push({ name, heard: '(missing file)' })
    continue
  }
  const heard = skipStt ? null : (await transcribe(path)).trim()
  const ok = heard === null || !spec.expect || new RegExp(spec.expect, 'i').test(heard)
  const seconds = Math.round(duration(path) * 1000) / 1000
  console.log(`${heard === null ? '--  ' : ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(10)} ${seconds.toFixed(2)}s  heard: ${heard === null ? '(not checked)' : `"${heard}"`}`)
  if (ok) passed.push({ name, type: name.split('_')[0], seconds, heard })
  else failed.push({ name, heard })
}

writeFileSync(join(OUT_ROOT, dir, 'index.json'), JSON.stringify({ verified: !skipStt, clips: passed }, null, 2) + '\n')
console.log(`\n${passed.length} passed, ${failed.length} failed → ${dir}/index.json`)
if (failed.length) console.log('failed: ' + failed.map((f) => f.name).join(', '))
