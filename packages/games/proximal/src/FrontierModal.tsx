import type { ConceptFrontierNode, FrontierSnapshot } from './engine/frontier'
import type { ConceptId, ConceptOverride } from './types'

const LAYER_TITLES: Record<number, string> = {
  0: 'Stage 1 · Foundations (Entry)',
  1: 'Stage 2 · Number Structure',
  2: 'Stage 3 · Addition, Base 10 & Everyday Math',
  3: 'Stage 4 · Subtraction & Fact Fluency',
  4: 'Stage 5 · Multiplication & Division',
  5: 'Stage 6 · Fractions & Higher Math Horizon',
}

interface FrontierModalProps {
  frontier: FrontierSnapshot
  onClose: () => void
  onSelectConcept: (conceptId: ConceptId) => void
  onCycleOverride: (conceptId: ConceptId, next: ConceptOverride | undefined) => void
  onResetOverrides: () => void
}

function nextOverride(cur: ConceptOverride | undefined): ConceptOverride | undefined {
  if (!cur) return 'mastered'
  if (cur === 'mastered') return 'frontier'
  return undefined
}

export function FrontierModal({
  frontier,
  onClose,
  onSelectConcept,
  onCycleOverride,
  onResetOverrides,
}: FrontierModalProps) {
  const layers = [0, 1, 2, 3, 4, 5].map((layer) => ({
    layer,
    title: LAYER_TITLES[layer],
    nodes: frontier.nodes.filter((n) => n.layer === layer),
  }))

  const hasOverrides = frontier.nodes.some((n) => n.override !== undefined)

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 select-none"
      onClick={onClose}
      data-frontier-modal
    >
      <div
        className="flex max-h-full w-full max-w-4xl flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 bg-slate-950/70">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>⚡ Learning Frontier Map</span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-extrabold text-emerald-300">
                {frontier.frontierIds.size} on frontier · {frontier.masteredIds.size} mastered
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Computed live from RenderBlocks apps ({frontier.totalEvidenceEvents} clean events
              {frontier.noiseFilteredCount > 0 ? `, ${frontier.noiseFilteredCount} rapid taps filtered` : ''}). Tap a skill to browse videos, or toggle status to steer the frontier.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasOverrides && (
              <button
                type="button"
                onClick={onResetOverrides}
                className="rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-200"
              >
                Reset to Auto
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close frontier map"
              className="h-9 w-9 rounded-full bg-slate-800 hover:bg-slate-700 text-base font-bold text-white flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 text-sky-300">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> ✓ Mastered (unlocks dependents)
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> ⚡ Active Frontier (ready now)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-600" /> 🔒 Ahead (waiting on prerequisites)
          </span>
        </div>

        {/* DAG Layers */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {layers.map(({ layer, title, nodes }) => (
            <section key={layer} className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {nodes.map((node) => (
                  <ConceptCard
                    key={node.id}
                    node={node}
                    onBrowse={() => onSelectConcept(node.id)}
                    onToggle={() => onCycleOverride(node.id, nextOverride(node.override))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConceptCard({
  node,
  onBrowse,
  onToggle,
}: {
  node: ConceptFrontierNode
  onBrowse: () => void
  onToggle: () => void
}) {
  const zoneStyles =
    node.zone === 'mastered'
      ? 'bg-sky-950/45 border-sky-500/50 text-sky-100'
      : node.zone === 'frontier'
        ? 'bg-emerald-950/50 border-emerald-400/60 text-emerald-50 shadow-sm'
        : 'bg-slate-950/60 border-slate-800 text-slate-400'

  const badge =
    node.zone === 'mastered'
      ? { text: '✓ Mastered', cls: 'bg-sky-500/25 text-sky-200' }
      : node.zone === 'frontier'
        ? { text: node.active ? '⚡ Practicing' : '⚡ Frontier', cls: 'bg-emerald-500/30 text-emerald-200' }
        : { text: '🔒 Ahead', cls: 'bg-slate-800 text-slate-400' }

  return (
    <div className={`flex flex-col justify-between gap-2 rounded-2xl border p-3 ${zoneStyles}`} data-frontier-node={node.id}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={onBrowse} className="text-left text-sm font-extrabold hover:underline">
            {node.label}
          </button>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${badge.cls}`}>{badge.text}</span>
        </div>
        <div className="mt-1 text-[11px] opacity-80 leading-snug">{node.note}</div>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px]">
        <button type="button" onClick={onBrowse} className="font-bold text-white/90 hover:text-white">
          Browse videos →
        </button>
        <button
          type="button"
          onClick={onToggle}
          title="Cycle parent status override (Auto → Mastered → Frontier → Auto)"
          className="rounded-md bg-white/10 hover:bg-white/20 px-2 py-0.5 font-bold text-white/90"
        >
          {node.override === 'mastered' ? 'Set: Mastered' : node.override === 'frontier' ? 'Set: Frontier' : 'Auto'}
        </button>
      </div>
    </div>
  )
}
