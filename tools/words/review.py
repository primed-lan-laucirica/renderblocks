#!/usr/bin/env python3
"""
Write a listening page for choosing each word's take by ear.

DIR/takes/<take>/<word>.mp3 hold the candidates (build.py --takes, sounds.py
--out). The page plays them side by side, starts from the current choices
in voices.txt, and gives back voices.txt lines for whatever is changed.
Plain HTML beside the clips: open DIR/index.html in a desktop browser.

    python3 tools/words/review.py DIR
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sounds import word_voices  # noqa: E402

ORDER = ['plain', 'tag', 'en', 'multi', 'kokoro']
LABEL = {'plain': 'plain', 'tag': 'phonemes', 'en': 'en', 'multi': 'original', 'kokoro': 'kokoro'}

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Words audio picker</title>
<style>
:root { --bg:#f8fafc; --fg:#0f172a; --muted:#64748b; --card:#fff; --line:#e2e8f0; --bad:#dc2626; --pick:#16a34a; --accent:#2563eb; }
@media (prefers-color-scheme: dark) { :root { --bg:#0f172a; --fg:#e2e8f0; --muted:#94a3b8; --card:#1e293b; --line:#334155; --bad:#f87171; --pick:#4ade80; --accent:#60a5fa; } }
body { margin:0; font:16px/1.4 system-ui, sans-serif; background:var(--bg); color:var(--fg); }
header { position:sticky; top:0; background:var(--bg); border-bottom:1px solid var(--line); padding:12px 16px; z-index:1; }
h1 { font-size:20px; margin:0 0 4px; } p { margin:4px 0; color:var(--muted); font-size:14px; }
.bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:8px; }
button { font:inherit; border:1px solid var(--line); background:var(--card); color:var(--fg); border-radius:10px; padding:6px 10px; cursor:pointer; }
button.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
main { padding:8px 16px 40px; max-width:1000px; }
h2 { font-size:15px; color:var(--muted); margin:18px 0 6px; }
.w { background:var(--card); border:2px solid var(--line); border-radius:12px; padding:8px 10px; margin:6px 0; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.w.now { outline:3px solid var(--accent); } .w.changed { border-color:var(--pick); } .w.none { border-color:var(--bad); }
.w b { font-size:20px; min-width:110px; } .w b small { display:block; color:var(--muted); font-size:11px; font-weight:400; }
.take { display:inline-flex; border:2px solid var(--line); border-radius:10px; overflow:hidden; }
.take button { border:0; border-radius:0; } .take .pick { font-size:13px; color:var(--muted); }
.take.on { border-color:var(--pick); } .take.on .pick { background:var(--pick); color:#fff; }
.nogood.on { background:var(--bad); color:#fff; border-color:var(--bad); }
pre { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:8px; white-space:pre-wrap; margin:6px 0 0; font-size:13px; }
</style></head><body>
<header>
<h1>Words audio picker</h1>
<p>▶ plays a take; tap its name to choose it for that word. Every word starts on its current take (<b>plain</b> unless chosen otherwise). <b>none good</b> marks a word to work on individually. <b>Play all current</b> runs through the chosen takes.</p>
<div class="bar"><button class="primary" id="all">▶ Play all current</button><button id="stop">■ Stop</button>
<span>Changed: <span id="count">0</span> · none good: <span id="nones">0</span></span><button id="copy">Copy for Claude</button></div>
<pre id="out"></pre>
</header>
<main id="main"></main>
<script>
const WORDS = __WORDS__, TAKES = __TAKES__, LABEL = __LABEL__, START = __START__;
const KEY = 'words-audio-picker';
let pick = {}, none = new Set();
try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); pick = s.pick || {}; none = new Set(s.none || []); } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ pick, none: [...none] })); } catch {} ; show(); };
const current = (w) => pick[w] || START[w] || 'plain';
const audio = new Audio(), rows = {};
const main = document.getElementById('main');
let level = 0;
for (const { w, l, p } of WORDS) {
  if (l !== level) { level = l; const h = document.createElement('h2'); h.textContent = 'Level ' + l; main.append(h); }
  const d = document.createElement('div'); d.className = 'w';
  d.innerHTML = `<b>${w}<small>${p}</small></b>` + TAKES.map((t) => `<span class="take" data-t="${t}"><button class="play" title="play">▶</button><button class="pick">${LABEL[t]}</button></span>`).join('') + '<button class="nogood">none good</button>';
  for (const t of TAKES) {
    const el = d.querySelector(`[data-t="${t}"]`);
    el.querySelector('.play').onclick = () => play(w, t);
    el.querySelector('.pick').onclick = () => { pick[w] = t; none.delete(w); save(); play(w, t); };
  }
  d.querySelector('.nogood').onclick = () => { none.has(w) ? none.delete(w) : none.add(w); save(); };
  main.append(d); rows[w] = d;
}
function play(w, t) { audio.src = `takes/${t}/${encodeURIComponent(w)}.mp3`; audio.play(); for (const r of Object.values(rows)) r.classList.remove('now'); rows[w].classList.add('now'); }
function show() {
  const changed = WORDS.filter(({ w }) => current(w) !== (START[w] || 'plain'));
  for (const { w } of WORDS) {
    const r = rows[w];
    for (const el of r.querySelectorAll('.take')) el.classList.toggle('on', el.dataset.t === current(w));
    r.classList.toggle('changed', changed.some((c) => c.w === w)); r.classList.toggle('none', none.has(w));
    r.querySelector('.nogood').classList.toggle('on', none.has(w));
  }
  document.getElementById('count').textContent = changed.length;
  document.getElementById('nones').textContent = none.size;
  const byTake = {};
  for (const { w } of WORDS) { const t = current(w); if (t !== 'plain') (byTake[t] ||= []).push(w); }
  const lines = Object.entries(byTake).map(([t, ws]) => `${t} | ${ws.join(' ')}`);
  if (none.size) lines.push(`none good: ${[...none].join(' ')}`);
  document.getElementById('out').textContent = lines.join('\\n') || '(every word on plain)';
}
let stop = false;
document.getElementById('all').onclick = async () => {
  stop = false;
  for (const { w } of WORDS) {
    if (stop) break;
    play(w, current(w)); rows[w].scrollIntoView({ block: 'center', behavior: 'smooth' });
    await new Promise((r) => { audio.onended = r; audio.onerror = r; });
    await new Promise((r) => setTimeout(r, 700));
  }
};
document.getElementById('stop').onclick = () => { stop = true; audio.pause(); };
document.getElementById('copy').onclick = () => navigator.clipboard?.writeText(document.getElementById('out').textContent);
show();
</script></body></html>
"""


def main():
    folder = sys.argv[1]
    words = json.load(open(os.path.join(HERE, '..', '..', 'packages', 'games', 'words', 'src', 'data', 'words.json')))
    from sounds import pronunciations
    cmu = pronunciations()
    takes = [t for t in ORDER if os.path.isdir(os.path.join(folder, 'takes', t))]
    data = [{'w': w['word'], 'l': w['level'], 'p': ' '.join(cmu[w['word']])} for w in words]
    html = (PAGE.replace('__WORDS__', json.dumps(data)).replace('__TAKES__', json.dumps(takes))
            .replace('__LABEL__', json.dumps(LABEL)).replace('__START__', json.dumps(word_voices())))
    open(os.path.join(folder, 'index.html'), 'w', encoding='utf-8').write(html)
    print(f'{len(data)} words, takes: {" ".join(takes)} → {os.path.join(folder, "index.html")}')


if __name__ == '__main__':
    main()
