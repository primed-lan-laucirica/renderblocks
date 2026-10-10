// Generate Story5's narration clips (ElevenLabs, the house voice from
// tools/audio/manifest.json) and list them in src/voice.json.
//
//   pnpm --filter @renderblocks/story5 voice           only lines with no clip yet
//   pnpm --filter @renderblocks/story5 voice --force   redo every clip
//
// Each clip is named for its text, so editing a line makes a new clip; clips
// no line uses any more are removed. Every clip is trimmed, levelled with
// tools/words/level.py (one-pass loudnorm barely acts on short clips) and
// measured, so the tests can check that no line runs into the next.
// The API key is read from ~/.config/elevenlabs/key (or $ELEVENLABS_API_KEY).
import { createServer } from 'vite'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const repo = path.resolve(root, '../../..')
const outDir = path.join(repo, 'packages/app/public/games/story5/voice')
const listFile = path.join(root, 'src/voice.json')
const force = process.argv.includes('--force')

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim()
  const raw = fs.readFileSync(path.join(os.homedir(), '.config/elevenlabs/key'), 'utf8').trim()
  const m = raw.match(/=\s*['"]?([^'"\s]+)['"]?\s*$/)
  return m ? m[1] : raw
}

const voice = JSON.parse(fs.readFileSync(path.join(repo, 'tools/audio/manifest.json'), 'utf8')).voice
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true } })
const { allLines } = await server.ssrLoadModule('/src/voice-lines.ts')
const lines = allLines()
await server.close()

const fileFor = (text) => {
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  const hash = createHash('sha1').update(`${voice.id}|${voice.model}|${text}`).digest('hex').slice(0, 6)
  return `${slug}-${hash}.mp3`
}
const duration = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())

fs.mkdirSync(outDir, { recursive: true })
const list = {}
let made = 0
for (const text of lines) {
  const file = fileFor(text)
  const dest = path.join(outDir, file)
  if (force || !fs.existsSync(dest)) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: voice.model, voice_settings: voice.settings }),
    })
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)} for "${text}"`)
    const raw = `${dest}.raw.mp3`
    fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()))
    // Trim the silence at the ends only (pauses inside a sentence stay); the house format.
    const trim =
      'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03,areverse,' +
      'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse'
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-af', trim, '-ar', '48000', '-ac', '1', '-b:a', '64k', dest])
    fs.rmSync(raw)
    execFileSync('python3', [path.join(repo, 'tools/words/level.py'), dest], { stdio: 'ignore' })
    made++
  }
  list[text] = { file, dur: Math.round(duration(dest) * 100) / 100 }
  console.log(`${list[text].dur.toFixed(2)} s  ${file}  "${text}"`)
}
const keep = new Set(Object.values(list).map((c) => c.file))
for (const f of fs.readdirSync(outDir)) if (!keep.has(f)) fs.rmSync(path.join(outDir, f))
fs.writeFileSync(listFile, JSON.stringify(list, null, 2) + '\n')
console.log(`\n${made} generated, ${lines.length - made} kept → ${path.relative(repo, outDir)}`)
