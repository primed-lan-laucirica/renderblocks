/**
 * An explainer, with no player around it: it plays in the puzzle screen's
 * body, under the puzzle's own header, drawn in the puzzle's own boxes and
 * colours, starts by itself, and at the end dissolves into the real puzzle
 * underneath (the caller fades one out and the other in).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useScenePlayer, type SceneDef } from '@renderblocks/scene'
import { StageProvider, VOICE } from './kit'

interface Props {
  scene: SceneDef
  /** Starts once this is true (after the zoom in). */
  go: boolean
  /** Held on this frame until it starts (the window's picture). */
  still?: number
  dark: boolean
  /** The screen's width (cells are sized from it, as the puzzle's are). */
  vw: number
  onFinished: () => void
}

export function Explainer({ scene, go, still = 0, dark, vw, onFinished }: Props) {
  const { t, loaded, start } = useScenePlayer(scene, VOICE, { still, onFinished })
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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
    <div ref={box} className="absolute inset-0 select-none" data-explainer={scene.id}>
      <div ref={sceneEl} className="absolute inset-0">
        {size && (
          <StageProvider value={{ ...size, vw, dark }}>
            <Scene t={t} />
          </StageProvider>
        )}
      </div>
    </div>
  )
}
