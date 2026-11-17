import { useState } from 'react'
import { ANCHOR_BY_ID, CONCEPT_BY_ID, formatDuration, thumbnailUrl } from './data/taxonomy'
import type { FeedCard, ProximalVideo, ThumbnailMode } from './types'

interface VideoCardProps {
  card: FeedCard
  thumbMode: ThumbnailMode
  liked: boolean
  saved: boolean
  watched: boolean
  onPlay: (video: ProximalVideo) => void
  onToggleLike: (id: string) => void
  onToggleSave: (id: string) => void
  onMoreLikeThis: (video: ProximalVideo) => void
}

export function VideoCard({
  card,
  thumbMode,
  liked,
  saved,
  watched,
  onPlay,
  onToggleLike,
  onToggleSave,
  onMoreLikeThis,
}: VideoCardProps) {
  const { video, reason, frontierBadge } = card
  const [fallbackPoster, setFallbackPoster] = useState(false)
  const effectiveMode: ThumbnailMode = fallbackPoster ? 'poster' : thumbMode
  const anchorMeta = ANCHOR_BY_ID[video.seedAnchor]
  const primaryConcept = video.concepts[0] ? CONCEPT_BY_ID[video.concepts[0]] : null

  return (
    <article
      className={`group flex flex-col rounded-2xl overflow-hidden bg-slate-800/85 border transition-colors shadow-sm ${
        frontierBadge ? 'border-emerald-500/50 hover:border-emerald-400' : 'border-slate-700/70 hover:border-slate-500'
      }`}
      data-video-card={video.id}
    >
      {/* Thumbnail button */}
      <button
        type="button"
        onClick={() => onPlay(video)}
        className="relative aspect-video w-full bg-slate-900 overflow-hidden text-left focus:outline-none"
      >
        <img
          src={thumbnailUrl(video.id, effectiveMode)}
          alt={video.title}
          loading="lazy"
          onError={() => {
            if (!fallbackPoster && thumbMode === 'midpoint') setFallbackPoster(true)
          }}
          className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {/* Top-left role / frontier / compilation badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {frontierBadge && (
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-extrabold text-slate-950 shadow">
              ⚡ FRONTIER
            </span>
          )}
          {video.role === 'seed' ? (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow"
              style={{ backgroundColor: anchorMeta.color }}
            >
              SEED
            </span>
          ) : (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white/95 shadow backdrop-blur-xs"
              style={{ backgroundColor: `${anchorMeta.color}CC` }}
            >
              {Math.round(video.seedSim * 100)}% {anchorMeta.shortLabel}
            </span>
          )}
          {video.format === 'compilation' && (
            <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300 uppercase">
              Pack
            </span>
          )}
        </div>

        {watched && (
          <span className="absolute top-2 right-2 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            Watched
          </span>
        )}

        <div className="absolute inset-x-2.5 bottom-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-extrabold text-slate-900 shadow">
            ▶ Play
          </span>
          <span className="rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white">
            {formatDuration(video.duration)}
          </span>
        </div>
      </button>

      {/* Card body */}
      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onPlay(video)}
            className="line-clamp-2 text-left text-sm font-bold leading-snug text-slate-100 hover:text-sky-300"
          >
            {video.title}
          </button>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 truncate max-w-[180px]">{video.channel}</span>
            {primaryConcept && (
              <span
                className="rounded-full px-2 py-0.2 text-[11px] font-semibold"
                style={{ backgroundColor: `${primaryConcept.color}28`, color: '#E2E8F0', border: `1px solid ${primaryConcept.color}66` }}
              >
                {primaryConcept.label}
              </span>
            )}
          </div>
          {reason && (
            <div className={`text-[11px] truncate ${frontierBadge ? 'font-bold text-emerald-300' : 'text-slate-400'}`}>
              {reason}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleLike(video.id)}
              aria-pressed={liked}
              title={liked ? 'Unlike' : 'Like'}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                liked ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {liked ? '♥ Liked' : '♡ Like'}
            </button>
            <button
              type="button"
              onClick={() => onToggleSave(video.id)}
              aria-pressed={saved}
              title={saved ? 'Remove from Watch Later' : 'Save to Watch Later'}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                saved ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {saved ? '✓ Saved' : '+ Later'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => onMoreLikeThis(video)}
            title="Find similar videos"
            className="rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/40 px-2.5 py-1 text-xs font-bold text-indigo-200 transition-colors"
          >
            ✦ Similar
          </button>
        </div>
      </div>
    </article>
  )
}
