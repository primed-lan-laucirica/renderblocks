// Render Story5 scenes to MP4 (headless Chrome + ffmpeg), or check that they're deterministic.
//
//   pnpm --filter @renderblocks/story5 render ep5 [ep13 …] [--fps 30] [--out dir]
//   pnpm --filter @renderblocks/story5 render --all
//   pnpm --filter @renderblocks/story5 check            (every scene)
//   pnpm --filter @renderblocks/story5 render ep5 --stills 4,13.4,17   (PNG stills, as in the original)
//
// Adapted from Drive Story5/render.mjs. The page is render.html, served by Vite
// from this package; each frame is window.seek(t) then a screenshot of #stage.
// The soundtrack is the scene's cue list and narration, rendered offline with the
// same tone table and clips the player uses, and muxed in by ffmpeg.
// Check mode renders a few timestamps, then the same timestamps again in reverse
// order, and fails unless every pair of frames is byte-for-byte identical.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const args = process.argv.slice(2)
const flag = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const check = args.includes('--check')
const fps = Number(flag('--fps', '30'))
const stills = flag('--stills', null)
const outDir = path.resolve(flag('--out', path.join(root, 'out')))
const ALL = ['ep0', 'ep5', 'ep13', 'ep23']
const named = args.filter((a, i) => /^ep\d+$/.test(a) && !['--fps', '--out', '--stills'].includes(args[i - 1]))
const ids = check || args.includes('--all') || !named.length ? ALL : named

// The app's public folder, for the narration clips.
const server = await createServer({ root, publicDir: path.resolve(root, '../../app/public'), plugins: [react()], logLevel: 'error', server: { port: 0 } })
await server.listen()
const url = server.resolvedUrls.local[0]
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.error('PAGEERR', e.message))

let failed = 0
for (const id of ids) {
  await page.goto(`${url}render.html?ep=${id}`)
  await page.waitForFunction(() => typeof window.seek === 'function')
  await page.evaluate(() => document.fonts.ready)
  const D = await page.evaluate(() => window.DURATION)
  const stage = await page.$('#stage')
  const shot = async (t, file) => {
    await page.evaluate((x) => window.seek(x), t)
    return stage.screenshot(file ? { path: file, type: 'jpeg', quality: 93 } : { type: 'png' })
  }
  if (check) {
    const times = [0.5, D * 0.27, D * 0.5, D * 0.83, D - 0.05]
    const first = []
    for (const t of times) first.push(await shot(t))
    let same = 0
    for (let i = times.length - 1; i >= 0; i--) if ((await shot(times[i])).equals(first[i])) same++
    const ok = same === times.length
    if (!ok) failed++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}: ${same}/${times.length} frames identical on a second render (t = ${times.map((t) => t.toFixed(1)).join(', ')})`)
    continue
  }
  if (stills) {
    fs.mkdirSync(outDir, { recursive: true })
    for (const t of stills.split(',').map(Number)) {
      await page.evaluate((x) => window.seek(x), t)
      await stage.screenshot({ path: path.join(outDir, `${id}_${t}.png`) })
    }
    console.log(`${id}: ${stills.split(',').length} stills → ${outDir}`)
    continue
  }
  const dir = path.join(outDir, id)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const n = Math.round(D * fps)
  for (let i = 0; i < n; i++) await shot(i / fps, path.join(dir, `f${String(i).padStart(5, '0')}.jpg`))
  fs.writeFileSync(path.join(dir, 'audio.wav'), Buffer.from(await page.evaluate(() => window.soundtrack()), 'base64'))
  const mp4 = path.join(outDir, `${id}.mp4`)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-i', path.join(dir, 'audio.wav'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-c:a', 'aac', '-shortest', mp4])
  fs.rmSync(dir, { recursive: true, force: true })
  console.log(`${id}: ${n} frames → ${mp4}`)
}
await browser.close()
await server.close()
process.exit(failed ? 1 : 0)
