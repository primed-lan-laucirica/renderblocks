/**
 * An explainer, with no player around it: the worked example fills the
 * screen on the puzzle screen's own paper, starts by itself, and at the end
 * dissolves into his first real puzzle (the caller fades it out). The faint
 * ← is the only way out.
 */
import { useEffect, useRef } from 'react'
import { useScenePlayer, type SceneDef } from '@renderblocks/scene'
import { VOICE } from './kit'

interface Props {
  scene: SceneDef
  /** Starts once this is true (after the zoom in). */
  go: boolean
  /** Held on this frame until it starts (the window's picture). */
  still?: number
  onFinished: () => void
  onBack: () => void
  stageRef?: React.Ref<HTMLDivElement>
}

export function Explainer({ scene, go, still = 0, onFinished, onBack, stageRef }: Props) {
  const { t, loaded, start } = useScenePlayer(scene, VOICE, { still, onFinished })
  const sceneEl = useRef<HTMLDivElement>(null)
  const begun = useRef(false)
  useEffect(() => {
    if (!go || !loaded || begun.current) return
    begun.current = true
    // The window's picture (the example solved) dissolves into the opening.
    const el = sceneEl.current
    if (!el || still === 0) return start(0)
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).onfinish = () => {
      start(0)
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, loaded])

  const { Scene } = scene
  return (
    <div className="h-dvh w-full relative overflow-hidden select-none" style={{ background: '#f3f1fe' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div ref={stageRef} className="relative" style={{ aspectRatio: '16 / 9', width: 'min(100vw, calc(100dvh * 16 / 9))' }}>
          <div ref={sceneEl} className="absolute inset-0">
            <Scene t={t} />
          </div>
        </div>
      </div>
      <button type="button" onClick={onBack} className="absolute top-3 left-3 w-11 h-11 rounded-full text-2xl font-bold text-slate-500 opacity-40 active:opacity-80" aria-label="Back">
        ←
      </button>
    </div>
  )
}
