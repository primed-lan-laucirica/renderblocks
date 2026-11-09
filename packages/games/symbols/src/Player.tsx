/**
 * One player for every explainer, with no player around it: the scene fills
 * the screen on its own paper, starts by itself, and carries straight on
 * into each of his turns and out again. A single clock drives t; the scene
 * draws that t and nothing else (the shared scene player). At a turn the
 * clock stops, the line is spoken, and the paper is his; then it carries on.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useScenePlayer } from '@renderblocks/scene/useScenePlayer'
import type { Explainer } from './engine/compile'
import { TurnOverlay } from './engine/TurnOverlay'
import * as VOICE from './engine/voice'
import { INK, SANS } from './kit/look'

interface Props {
  scene: Explainer
  /** Starts playing once this is true (after the zoom in). */
  go: boolean
  /** What its window on the road showed: held until it starts, so the zoom in lands on the same picture. */
  cover: ReactNode
  onTurnDone: (id: string) => void
  /** The last frame has been held a moment. */
  onFinished: () => void
  onBack: () => void
  /** The 16:9 stage, for the zoom in and out. */
  stageRef?: React.Ref<HTMLDivElement>
}

export function Player({ scene, go, cover, onTurnDone, onFinished, onBack, stageRef }: Props) {
  const { t, beat, loaded, start, finishBeat: carryOn, sayPrompt } = useScenePlayer(scene, VOICE, { onFinished })
  const [covered, setCovered] = useState(true)

  const finishTurn = () => {
    const id = carryOn()
    if (id) onTurnDone(id)
  }

  // It starts by itself (once the zoom in has landed), and loads its voice first.
  const begun = useRef(false)
  const coverEl = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!go || !loaded || begun.current) return
    begun.current = true
    // The window's picture dissolves into the opening.
    const el = coverEl.current
    const begin = () => {
      setCovered(false)
      start(0)
    }
    if (!el) return begin()
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' }).onfinish = begin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, loaded])

  const { Scene } = scene
  const mine = beat ? scene.turns.find((x) => x.turn.id === beat.id) : undefined
  return (
    <div className="h-dvh w-full relative overflow-hidden select-none">
      {/* The stage: 16:9, as large as the screen allows, on paper to the edges. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div ref={stageRef} className="relative" style={{ aspectRatio: '16 / 9', width: 'min(100vw, calc(100dvh * 16 / 9))', containerType: 'inline-size' }}>
          <div className="absolute inset-0">
            <Scene t={t} beat={beat?.id} />
          </div>
          {covered && (
            <div ref={coverEl} className="absolute inset-0">
              {cover}
            </div>
          )}
          {mine && <TurnOverlay key={mine.turn.id} turn={mine.turn} onDone={finishTurn} />}
          {/* His turn: the few words of it, small in the corner; a tap says the line again. */}
          {beat && mine && (
            <button
              type="button"
              onClick={() => sayPrompt(beat)}
              className="absolute right-[2%] top-[2.5%] whitespace-nowrap text-right"
              style={{ fontFamily: SANS, fontWeight: 700, color: INK, opacity: 0.6, fontSize: '2.1cqw', lineHeight: 1.1, animation: 'sym-rise 600ms ease-out' }}
              aria-label={`Say it again: ${beat.prompt}`}
            >
              {beat.prompt}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes sym-rise { from { opacity: 0; transform: translateY(12px) } to { opacity: 0.6; transform: none } }`}</style>
      {/* The only way out, faint in the corner (and Android back). */}
      <button type="button" onClick={onBack} className="absolute top-3 left-3 w-11 h-11 rounded-full text-2xl font-bold opacity-30 active:opacity-70" style={{ color: INK }} aria-label="Back">
        ←
      </button>
    </div>
  )
}
