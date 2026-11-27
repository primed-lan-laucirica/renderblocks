import { useEffect, useRef, useState } from 'react'
import { createProgressLog } from '../services/progress'
import { BAND_BY_ID, CONCEPT_BY_ID, SUBJECT_BY_ID } from './taxonomy'
import { recordVqCompletion, readVqCadence, writeVqCadence, type ValidationQuizlet } from './vq'

interface VqPopupProps {
  quizlet: ValidationQuizlet
  /** When true (manual Quick Check), offers "Next Check" after answering; otherwise auto-closes. */
  allowNext?: boolean
  onAnswered?: (result: { quizlet: ValidationQuizlet; okFirstTry: boolean; ms: number }) => void
  onNext?: () => void
  onClose: (skipped: boolean) => void
}

/** Gentle WebAudio star chime on right answer (no external clips required, silent if unavailable). */
function playGentleChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    for (const [offset, freq] of [
      [0, 523.25],
      [0.09, 659.25],
      [0.18, 783.99],
    ] as const) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + offset)
      gain.gain.setValueAtTime(0.001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.14, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.24)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.26)
    }
  } catch {
    // ignore audio restrictions
  }
}

function currentMs(): number {
  return Date.now()
}

const vqLog = createProgressLog('vq')

/**
 * Simple, high-signal Validation Quizlet popup.
 * - Reinforces right answers (warm emerald star + chime)
 * - Starves wrong taps (quiet dim, no funny animation/buzzer)
 * - Records first-try result + reaction time to shared `renderblocks-progress`
 */
export function VqPopup(props: VqPopupProps) {
  return <VqPopupBody key={props.quizlet.id} {...props} />
}

function VqPopupBody({ quizlet, allowNext = false, onAnswered, onNext, onClose }: VqPopupProps) {
  const [wrongIndexes, setWrongIndexes] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const shownAtRef = useRef<number>(0)
  const recordedRef = useRef<boolean>(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    shownAtRef.current = currentMs()
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const subj = SUBJECT_BY_ID[quizlet.subject]
  const conceptMeta = CONCEPT_BY_ID[quizlet.concept]
  const bandMeta = BAND_BY_ID[quizlet.band]

  const recordOutcome = (okFirstTry: boolean, ms: number) => {
    if (recordedRef.current) return
    recordedRef.current = true
    vqLog.record({
      concept: quizlet.concept,
      item: quizlet.id,
      ok: okFirstTry,
      how: 'vq',
      ms,
    })
    if (quizlet.ccss && quizlet.progressItem) {
      vqLog.record({
        concept: quizlet.ccss,
        item: quizlet.progressItem,
        ok: okFirstTry,
        how: 'vq',
        ms,
      })
    }
    const nextCadence = recordVqCompletion(readVqCadence(), quizlet.id, false)
    writeVqCadence(nextCadence)
    onAnswered?.({ quizlet, okFirstTry, ms })
  }

  const handleChoice = (idx: number) => {
    if (solved || wrongIndexes.includes(idx)) return
    const elapsed = shownAtRef.current > 0 ? currentMs() - shownAtRef.current : 1000
    const ms = Math.max(0, elapsed)
    if (idx === quizlet.correctIndex) {
      const okFirstTry = wrongIndexes.length === 0
      setSolved(true)
      playGentleChime()
      recordOutcome(okFirstTry, ms)
      if (!allowNext) {
        timerRef.current = window.setTimeout(() => onClose(false), 950)
      }
    } else {
      setWrongIndexes((prev) => [...prev, idx])
      recordOutcome(false, ms)
    }
  }

  const handleSkip = () => {
    if (!recordedRef.current) {
      const nextCadence = recordVqCompletion(readVqCadence(), quizlet.id, true)
      writeVqCadence(nextCadence)
    }
    onClose(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 select-none"
      data-vq-popup={quizlet.id}
    >
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-slate-700 shadow-2xl p-5 sm:p-6 text-white">
        {/* Compact header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-extrabold text-emerald-300">
              ⚡ Quick Check
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
              style={{ backgroundColor: `${subj.color}CC` }}
            >
              {conceptMeta.label}
            </span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">
              {bandMeta.shortLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-full bg-slate-800 hover:bg-slate-700 px-3 py-1 text-xs font-bold text-slate-300"
          >
            {solved ? 'Done' : 'Skip'}
          </button>
        </div>

        {/* Visual aid (dots or fraction bar, minimal & clear) */}
        {quizlet.visual?.kind === 'dots' && (
          <div className="mb-4 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-slate-950/70 p-4">
            {Array.from({ length: quizlet.visual.count }, (_, i) => (
              <span
                key={i}
                className="h-7 w-7 rounded-full shadow"
                style={{ backgroundColor: quizlet.visual?.kind === 'dots' ? quizlet.visual.color ?? '#EF4444' : '#EF4444' }}
              />
            ))}
          </div>
        )}
        {quizlet.visual?.kind === 'fraction' && (
          <div className="mb-4 flex items-center justify-center rounded-2xl bg-slate-950/70 p-4">
            <div className="flex w-64 h-12 rounded-xl overflow-hidden border-2 border-slate-400">
              {Array.from({ length: quizlet.visual.denominator }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 border-r last:border-r-0 border-slate-400"
                  style={{
                    backgroundColor:
                      i < (quizlet.visual?.kind === 'fraction' ? quizlet.visual.numerator : 0)
                        ? '#9333EA'
                        : '#1E293B',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Big crisp prompt */}
        <div className="text-center mb-5">
          <div className="text-2xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
            {quizlet.prompt}
          </div>
          {quizlet.hint && <div className="mt-1 text-sm font-semibold text-slate-400">{quizlet.hint}</div>}
        </div>

        {/* Big touch-friendly answer grid */}
        <div className="grid grid-cols-2 gap-3">
          {quizlet.choices.map((choice, idx) => {
            const isCorrect = idx === quizlet.correctIndex
            const isWrong = wrongIndexes.includes(idx)
            const cls =
              solved && isCorrect
                ? 'bg-emerald-500 border-emerald-300 text-slate-950 scale-[1.02] shadow-lg shadow-emerald-500/30'
                : isWrong
                  ? 'bg-slate-900/50 border-slate-800 text-slate-600 opacity-45'
                  : 'bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border-slate-600 text-white'
            return (
              <button
                key={choice}
                type="button"
                disabled={solved || isWrong}
                onClick={() => handleChoice(idx)}
                data-vq-choice={idx}
                className={`min-h-16 sm:min-h-20 rounded-2xl border-2 px-3 py-3 text-xl sm:text-2xl font-black tabular-nums transition-all ${cls}`}
              >
                {solved && isCorrect ? `★ ${choice}` : choice}
              </button>
            )
          })}
        </div>

        {/* Post-answer footer in manual Quick Check mode */}
        {solved && allowNext && (
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="rounded-full bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-bold text-slate-200"
            >
              Done
            </button>
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="rounded-full bg-emerald-500 hover:bg-emerald-400 px-5 py-2 text-sm font-extrabold text-slate-950"
              >
                Next Check →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
