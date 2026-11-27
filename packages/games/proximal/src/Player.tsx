import { useEffect, useRef, useState } from 'react'
import { BAND_BY_ID, CONCEPT_BY_ID, SUBJECT_BY_ID, formatDuration, thumbnailUrl } from './data/taxonomy'
import type { FeedCard, ProximalVideo, ThumbnailMode } from './types'

const HOST = 'https://www.youtube-nocookie.com'
const ENDED = 0

function embedUrl(v: ProximalVideo, origin: string): string {
  const q = new URLSearchParams({
    rel: '0',
    fs: '0',
    playsinline: '1',
    iv_load_policy: '3',
    cc_load_policy: '1',
    enablejsapi: '1',
    origin,
  })
  if (v.start) q.set('start', String(v.start))
  if (v.end) q.set('end', String(v.end))
  return `${HOST}/embed/${v.id}?${q}`
}

function watchUrl(v: ProximalVideo): string {
  return `https://www.youtube.com/watch?v=${v.id}${v.start ? `&t=${v.start}s` : ''}`
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])
  return online
}

export interface WatchStats {
  dwellSec: number
  completed: boolean
  bailedFast: boolean
}

interface PlayerProps {
  video: ProximalVideo
  nearestSeed?: ProximalVideo
  related: FeedCard[]
  thumbMode: ThumbnailMode
  liked: boolean
  saved: boolean
  onBack: () => void
  onSelectVideo: (video: ProximalVideo) => void
  onToggleLike: (id: string) => void
  onToggleSave: (id: string) => void
  onExploreSimilar: (video: ProximalVideo) => void
  onWatchEnd?: (video: ProximalVideo, stats: WatchStats) => void
}

export function Player({
  video,
  nearestSeed,
  related,
  thumbMode,
  liked,
  saved,
  onBack,
  onSelectVideo,
  onToggleLike,
  onToggleSave,
  onExploreSimilar,
  onWatchEnd,
}: PlayerProps) {
  const online = useOnline()
  const subjMeta = SUBJECT_BY_ID[video.primarySubject]
  const bandMeta = BAND_BY_ID[video.levelBand]
  const startedAtRef = useRef<number>(0)
  const completedRef = useRef<boolean>(false)
  const onWatchEndRef = useRef(onWatchEnd)

  useEffect(() => {
    onWatchEndRef.current = onWatchEnd
  }, [onWatchEnd])

  useEffect(() => {
    startedAtRef.current = Date.now()
    completedRef.current = false
    const currentVideo = video
    return () => {
      const dwellSec = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
      const completed = completedRef.current || (currentVideo.duration > 0 && dwellSec >= currentVideo.duration * 0.8)
      const bailedFast = !completed && dwellSec < 15
      onWatchEndRef.current?.(currentVideo, { dwellSec, completed, bailedFast })
    }
  }, [video])

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 text-slate-100 overflow-y-auto select-none" data-proximal-player={video.id}>
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-slate-950/95 backdrop-blur-md px-3 py-2.5 border-b border-slate-800">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to browse"
          className="h-10 w-10 shrink-0 rounded-full bg-slate-800 hover:bg-slate-700 text-xl font-bold flex items-center justify-center"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base sm:text-lg font-extrabold text-white">{video.title}</h1>
          <div className="truncate text-xs text-slate-400">
            {video.channel} · {formatDuration(video.duration)} · {subjMeta.label} · {bandMeta.label}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleLike(video.id)}
            className={`rounded-full px-3.5 h-9 text-xs font-bold transition-colors ${
              liked ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {liked ? '♥ Liked' : '♡ Like'}
          </button>
          <button
            type="button"
            onClick={() => onToggleSave(video.id)}
            className={`rounded-full px-3.5 h-9 text-xs font-bold transition-colors ${
              saved ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {saved ? '✓ Saved' : '+ Later'}
          </button>
          <button
            type="button"
            onClick={() => window.open(watchUrl(video), '_blank')}
            className="hidden sm:inline-flex items-center rounded-full border border-slate-700 px-3.5 h-9 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            YouTube ↗
          </button>
        </div>
      </header>

      {/* Main video embed stage */}
      <div className="mx-auto w-full max-w-5xl px-3 pt-3">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl">
          {online ? (
            <EmbedScreen
              key={video.id}
              video={video}
              onEnded={() => {
                completedRef.current = true
              }}
            />
          ) : (
            <StatusCard
              title="Proximal needs the internet to play videos."
              subtitle="Your saved list and browsing catalog still work offline — playback resumes once reconnected."
            />
          )}
        </div>

        {/* Subject, Level Band & Concept Profile Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900/90 border border-slate-800 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-extrabold text-white"
              style={{ backgroundColor: subjMeta.color }}
            >
              {subjMeta.label}
            </span>
            <span className="rounded-full bg-slate-800 border border-slate-600 px-2.5 py-1 text-xs font-bold text-slate-100">
              {bandMeta.label}
            </span>
            {video.concepts.map((cid) => {
              const meta = CONCEPT_BY_ID[cid]
              if (!meta) return null
              return (
                <span
                  key={cid}
                  className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: `${meta.color}44`, border: `1px solid ${meta.color}` }}
                >
                  {meta.label}
                </span>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => onExploreSimilar(video)}
            className="rounded-full bg-indigo-500/25 hover:bg-indigo-500/40 border border-indigo-400/50 px-3 py-1 text-xs font-bold text-indigo-200"
          >
            ✦ Browse neighborhood on grid
          </button>
        </div>

        {nearestSeed && nearestSeed.id !== video.id && video.primarySubject === 'math' && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-slate-900/60 border border-slate-800/80 px-3 py-2 text-xs">
            <span className="text-slate-400 truncate">
              Closest seed reference: <strong className="text-slate-200">{nearestSeed.title}</strong> ({nearestSeed.channel})
            </span>
            <button
              type="button"
              onClick={() => onSelectVideo(nearestSeed)}
              className="shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 font-bold text-sky-300"
            >
              Watch seed →
            </button>
          </div>
        )}

        {/* Related Explorations strip */}
        <section className="mt-4 pb-6">
          <h2 className="mb-2.5 text-sm font-extrabold uppercase tracking-wider text-slate-400">
            Next Similar Videos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {related.slice(0, 8).map(({ video: rel }) => (
              <button
                key={rel.id}
                type="button"
                onClick={() => onSelectVideo(rel)}
                className="group flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-slate-600 text-left transition-colors"
              >
                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                  <RelatedThumb id={rel.id} title={rel.title} thumbMode={thumbMode} />
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {formatDuration(rel.duration)}
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="line-clamp-2 text-xs font-bold text-slate-100 group-hover:text-sky-300">{rel.title}</div>
                  <div className="mt-1 text-[11px] text-slate-400 truncate">{rel.channel}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function RelatedThumb({ id, title, thumbMode }: { id: string; title: string; thumbMode: ThumbnailMode }) {
  const [fallback, setFallback] = useState(false)
  return (
    <img
      src={thumbnailUrl(id, fallback ? 'poster' : thumbMode)}
      alt={title}
      loading="lazy"
      onError={() => {
        if (!fallback && thumbMode === 'midpoint') setFallback(true)
      }}
      className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform"
    />
  )
}

function EmbedScreen({ video, onEnded }: { video: ProximalVideo; onEnded?: () => void }) {
  const [state, setState] = useState<'on' | 'ended' | 'failed'>('on')
  const frameRef = useRef<HTMLIFrameElement>(null)
  const onEndedRef = useRef(onEnded)
  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  useEffect(() => {
    if (state !== 'on') return
    let heard = false
    const tell = (msg: object) =>
      frameRef.current?.contentWindow?.postMessage(JSON.stringify({ ...msg, id: 'proximal', channel: 'widget' }), HOST)
    const hello = () => {
      tell({ event: 'listening' })
      for (const name of ['onStateChange', 'onError']) tell({ event: 'command', func: 'addEventListener', args: [name] })
    }
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== HOST || e.source !== frameRef.current?.contentWindow || typeof e.data !== 'string') return
      try {
        const msg = JSON.parse(e.data) as { event?: string; info?: unknown }
        heard = true
        if (msg.event === 'onError') setState('failed')
        const played =
          msg.event === 'onStateChange'
            ? msg.info
            : msg.event === 'infoDelivery'
              ? (msg.info as { playerState?: number } | null)?.playerState
              : undefined
        if (played === ENDED) {
          setState('ended')
          onEndedRef.current?.()
        }
      } catch {
        // ignore non-JSON messages
      }
    }
    window.addEventListener('message', onMessage)
    const timer = window.setInterval(() => (heard ? window.clearInterval(timer) : hello()), 500)
    return () => {
      window.removeEventListener('message', onMessage)
      window.clearInterval(timer)
    }
  }, [state])

  if (state === 'failed') {
    return (
      <StatusCard
        title="This video will not play inside the app."
        subtitle="You can still open it directly on YouTube."
        action={{ label: 'Open in YouTube ↗', run: () => window.open(watchUrl(video), '_blank') }}
      />
    )
  }
  if (state === 'ended') {
    return (
      <StatusCard
        title="Finished!"
        subtitle="Pick a similar video below or watch it again."
        action={{ label: 'Watch again ↻', run: () => setState('on') }}
      />
    )
  }

  return (
    <iframe
      ref={frameRef}
      src={embedUrl(video, window.location.origin)}
      title={`${video.title} — ${video.channel}`}
      className="absolute inset-0 h-full w-full border-0"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="autoplay; encrypted-media; picture-in-picture"
    />
  )
}

function StatusCard({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: { label: string; run: () => void }
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center bg-slate-900">
      <div className="text-lg sm:text-xl font-extrabold text-white">{title}</div>
      {subtitle && <div className="text-sm text-slate-400 max-w-md">{subtitle}</div>}
      {action && (
        <button
          type="button"
          onClick={action.run}
          className="mt-2 rounded-full bg-amber-400 hover:bg-amber-300 px-5 py-2 text-sm font-extrabold text-slate-950"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
