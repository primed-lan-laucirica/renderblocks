/**
 * A deep dive: a lecture from YouTube that goes further than the explainer,
 * played here in YouTube's own player. It is always optional, and never
 * starts by itself. The player is YouTube's, untouched: nothing is drawn
 * over it, and its own controls and links are left as they are.
 *
 * It needs the internet. Without it, or when YouTube will not play the
 * video inside another page, it says so, and offers the same lecture on
 * YouTube itself.
 */
import { useEffect, useRef, useState } from 'react'
import { divesOf, embedUrl, minutesOf, watchUrl, type Dive as Lecture } from './data/dives'
import { rankOf } from './data/path'
import { GOLD, PAPER, SANS, SERIF } from './kit/look'

/** The dark the player sits on. */
const NIGHT = '#1f1813'
const HOST = 'https://www.youtube-nocookie.com'
/** YouTube's word for "it played to the end". */
const ENDED = 0

interface Props {
  rank: number
  onBack: () => void
}

export function Dive({ rank, onBack }: Props) {
  const list = divesOf(rank)
  const [n, setN] = useState(0)
  const d = list[n]
  const online = useOnline()
  if (!d) return null
  return (
    <div className="absolute inset-0 z-20 flex flex-col select-none" style={{ background: NIGHT, color: PAPER, fontFamily: SANS }} data-dive-view={rank}>
      <div className="flex items-center gap-3 pl-3 pr-4 pt-3 pb-2">
        <button type="button" onClick={onBack} className="w-11 h-11 shrink-0 rounded-full text-2xl font-bold opacity-60 active:opacity-100" aria-label="Back">
          ←
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 13, fontWeight: 700, opacity: 0.6, letterSpacing: 0.4 }}>
            DEEP DIVE · {rank} · {rankOf(rank).name}
          </div>
          <div className="truncate" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 20, lineHeight: 1.25 }}>
            {d.title}
          </div>
          <div className="truncate" style={{ fontSize: 14, opacity: 0.75 }}>
            {d.by} · {minutesOf(d)} min
          </div>
        </div>
        <button type="button" onClick={() => window.open(watchUrl(d), '_blank')} className="shrink-0 rounded-full px-4 h-11 font-bold active:opacity-70" style={{ fontSize: 15, border: `2px solid ${PAPER}55` }} data-dive-out>
          Open in YouTube ↗
        </button>
      </div>
      {/* The rank's other lectures. */}
      {list.length > 1 && (
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
          {list.map((x, i) => (
            <button
              key={x.id + i}
              type="button"
              onClick={() => setN(i)}
              aria-pressed={i === n}
              className="shrink-0 rounded-full px-3 py-1 whitespace-nowrap font-bold"
              style={{ fontSize: 14, background: i === n ? GOLD : 'transparent', color: i === n ? NIGHT : PAPER, border: `2px solid ${i === n ? GOLD : `${PAPER}44`}` }}
              data-dive-pick={i}
            >
              {i + 1} · {x.on ?? x.by} · {minutesOf(x)} min
            </button>
          ))}
        </div>
      )}
      {/* The player: 16:9, as large as what is left of the screen allows. */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-2 pb-2" style={{ containerType: 'size' }}>
        <div className="relative" style={{ aspectRatio: '16 / 9', width: 'min(100cqw, 100cqh * 16 / 9)' }}>
          {online ? <Screen key={`${n}:${d.id}`} d={d} /> : <Card line="A deep dive needs the internet." note="It will be here when the tablet is back online." />}
        </div>
      </div>
    </div>
  )
}

/** Whether there is a connection (as far as the device says). */
function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', on)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', on)
    }
  }, [])
  return online
}

/** One lecture in YouTube's player. It listens to what the player says of itself: an error, or that it reached the end. */
function Screen({ d }: { d: Lecture }) {
  const [state, setState] = useState<'on' | 'ended' | 'failed'>('on')
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (state !== 'on') return
    let heard = false
    const tell = (msg: object) => frame.current?.contentWindow?.postMessage(JSON.stringify({ ...msg, id: 'dive', channel: 'widget' }), HOST)
    // The player speaks once it has been told someone is listening (this is all YouTube's own script would do; none of it is loaded into the app).
    const hello = () => {
      tell({ event: 'listening' })
      for (const name of ['onStateChange', 'onError']) tell({ event: 'command', func: 'addEventListener', args: [name] })
    }
    const on = (e: MessageEvent) => {
      if (e.origin !== HOST || e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return
      let msg: { event?: string; info?: unknown }
      try {
        msg = JSON.parse(e.data)
      } catch {
        return
      }
      heard = true
      if (msg.event === 'onError') setState('failed')
      const played = msg.event === 'onStateChange' ? msg.info : msg.event === 'infoDelivery' ? (msg.info as { playerState?: number } | null)?.playerState : undefined
      if (played === ENDED) setState('ended')
    }
    window.addEventListener('message', on)
    const id = window.setInterval(() => (heard ? window.clearInterval(id) : hello()), 500)
    return () => {
      window.removeEventListener('message', on)
      window.clearInterval(id)
    }
  }, [state])

  if (state === 'failed') return <Card line="This one will not play here." note="It can still be watched on YouTube." action={{ label: 'Open in YouTube ↗', run: () => window.open(watchUrl(d), '_blank') }} />
  if (state === 'ended') return <Card line="That is the end of it." action={{ label: 'Watch it again', run: () => setState('on') }} />
  return (
    <iframe
      ref={frame}
      src={embedUrl(d, window.location.origin)}
      title={`${d.title}, ${d.by}`}
      className="absolute inset-0 h-full w-full"
      style={{ border: 0 }}
      // YouTube refuses to play for a page that does not say where it is.
      referrerPolicy="strict-origin-when-cross-origin"
      allow="autoplay; encrypted-media; picture-in-picture"
    />
  )
}

function Card({ line, note, action }: { line: string; note?: string; action?: { label: string; run: () => void } }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl text-center px-6" style={{ border: `2px solid ${PAPER}33` }} data-dive-card>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 26 }}>{line}</div>
      {note && <div style={{ fontSize: 16, opacity: 0.75 }}>{note}</div>}
      {action && (
        <button type="button" onClick={action.run} className="mt-2 rounded-full px-5 h-11 font-bold active:opacity-70" style={{ fontSize: 16, background: GOLD, color: NIGHT }}>
          {action.label}
        </button>
      )}
    </div>
  )
}
