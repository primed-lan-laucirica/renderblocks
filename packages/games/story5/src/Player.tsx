/**
 * One player for every episode, with no player around it: the scene fills
 * the screen on its own paper, starts by itself, and carries straight on
 * into each interactive beat and out again, the way an animated app hands
 * over to the child. A single clock drives t; the scene draws that t and
 * nothing else. Sound cues and narration are scheduled on Web Audio from t.
 * At a beat the clock stops (a line being spoken finishes), the prompt is
 * spoken, and the child does the action; then it carries on.
 */
import { useEffect, useRef } from 'react'
import { useScenePlayer } from '@renderblocks/scene/useScenePlayer'
import type { SceneDef } from './engine/scene'
import * as VOICE from './engine/voice'
import { BeatOverlay } from './BeatOverlay'
import { INK, SANS } from './kit/sizes'

interface Props {
  scene: SceneDef
  /** Starts playing once this is true (after the zoom in). */
  go: boolean
  /** The moment its window showed: held until it starts, so the zoom in lands on the same picture. */
  still?: number
  onBeatDone: (id: string) => void
  /** The last frame has been held a moment. */
  onFinished: () => void
  onBack: () => void
  /** The 16:9 stage, for the zoom in and out. */
  stageRef?: React.Ref<HTMLDivElement>
}

export function Player({ scene, go, still = 0, onBeatDone, onFinished, onBack, stageRef }: Props) {
  const { t, beat, loaded, start, finishBeat: carryOn, sayPrompt } = useScenePlayer(scene, VOICE, { still, onFinished })

  const finishBeat = () => {
    const id = carryOn()
    if (id) onBeatDone(id)
  }

  // It starts by itself (once the zoom in has landed), and loads its voice first.
  const begun = useRef(false)
  useEffect(() => {
    if (!go || !loaded || begun.current) return
    begun.current = true
    // The window's picture dissolves into the opening.
    const el = sceneEl.current
    if (!el || still === 0) return start(0)
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).onfinish = () => {
      start(0)
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, loaded])

  const sceneEl = useRef<HTMLDivElement>(null)
  const { Scene } = scene
  return (
    <div className="h-dvh w-full relative overflow-hidden select-none">
      {/* The stage: 16:9, as large as the screen allows, on paper to the edges. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div ref={stageRef} className="relative" style={{ aspectRatio: '16 / 9', width: 'min(100vw, calc(100dvh * 16 / 9))', containerType: 'inline-size' }}>
          <div ref={sceneEl} className="absolute inset-0">
            <Scene t={t} beat={beat?.id} />
          </div>
          {/* His turn: the prompt as the scene's own words, on one line; a tap says it again. It sits under his pieces, so it never covers one. */}
          {beat && (
            <button
              type="button"
              onClick={() => sayPrompt(beat)}
              className="absolute left-1/2 -translate-x-1/2 top-[2.5%] whitespace-nowrap text-center"
              style={{ fontFamily: SANS, fontWeight: 700, color: INK, fontSize: '2.6cqw', lineHeight: 1.1, animation: 'story5-rise 600ms ease-out' }}
              aria-label={`Say it again: ${beat.prompt}`}
            >
              {beat.prompt}
            </button>
          )}
          {beat && <BeatOverlay beat={beat} onDone={finishBeat} />}
        </div>
      </div>
      <style>{`@keyframes story5-rise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }`}</style>
      {/* The only way out, faint in the corner (and Android back). */}
      <button type="button" onClick={onBack} className="absolute top-3 left-3 w-11 h-11 rounded-full text-2xl font-bold opacity-30 active:opacity-70" style={{ color: INK }} aria-label="Back">
        ←
      </button>
    </div>
  )
}
