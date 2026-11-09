/**
 * His turn: the scene has stopped and the paper is his. Each kind draws the
 * same furniture the scene shows when the explainer is watched straight
 * through (engine/turns), in the same places, and listens for his hand.
 * Nothing here is marked right or wrong for the record: a turn is watched
 * evidence, and the scene carries on with the answer either way.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { smooth } from '@renderblocks/scene/ease'
import { H, W } from '@renderblocks/scene/scene'
import { loose, row, Sprites, type Sprite } from '../kit/sprites'
import { blendLists, flat } from './compile'
import { cue, sfx } from './sound'
import type { BuildTurn, ChooseTurn, PlaceTurn, PredictTurn, Turn } from './spec'
import { chooseLayout, chooseSprites, placeLayout, placeLine, PredictView, PREDICT, predictX, SUPPLY, SupplyView, tileSprites, PLACE } from './turns'

/** A wrong pick locks the turn this long (the drills' rule). */
export const LOCKOUT_MS = 1200

const SHAKE = `@keyframes sym-shake { 0%, 100% { transform: translateX(0) } 20%, 60% { transform: translateX(-16px) } 40%, 80% { transform: translateX(16px) } }`

/** A pointer's place on the paper, in scene pixels. */
function at(e: { clientX: number; clientY: number; currentTarget: Element }) {
  const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as SVGSVGElement)
  const r = svg.getBoundingClientRect()
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
}

/** A list of sprites that glides to each new list given (matched by name). */
function useGlide(target: Sprite[], ms = 380) {
  const [shown, setShown] = useState(target)
  const now = useRef(target)
  useEffect(() => {
    const from = now.current
    if (from === target) return
    const t0 = performance.now()
    let raf = 0
    const tick = (clock: number) => {
      const k = Math.min(1, (clock - t0) / ms)
      now.current = k >= 1 ? target : blendLists(from, target, smooth(k))
      setShown(now.current)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return shown
}

/** Call `fn` once, `ms` after `when` turns true. */
function useAfter(when: boolean, ms: number, fn: () => void) {
  const f = useRef(fn)
  useEffect(() => {
    f.current = fn
  })
  useEffect(() => {
    if (!when) return
    const id = window.setTimeout(() => f.current(), ms)
    return () => window.clearTimeout(id)
  }, [when, ms])
}

function Predict({ turn, onDone }: { turn: PredictTurn; onDone: () => void }) {
  const [picked, setPicked] = useState(-1)
  useAfter(picked >= 0, 550, onDone)
  return (
    <>
      <PredictView turn={turn} picked={picked} />
      {turn.options.map((_, i) => (
        <rect
          key={i}
          data-pick={i}
          x={predictX(i) - PREDICT.w / 2}
          y={PREDICT.y - PREDICT.h / 2 - 20}
          width={PREDICT.w}
          height={PREDICT.h + 40}
          fill="transparent"
          onPointerDown={() => {
            if (picked >= 0) return
            cue('place')
            setPicked(i)
          }}
        />
      ))}
    </>
  )
}

function Choose({ turn, onDone }: { turn: ChooseTurn; onDone: () => void }) {
  // His cards start in a shuffled order, and change places after a miss.
  const [order, setOrder] = useState(() => {
    const o = turn.cards.map((_, i) => i)
    return Math.random() < 0.5 ? o.reverse() : o
  })
  const [gold, setGold] = useState(-1)
  const [miss, setMiss] = useState<{ card: number; n: number } | null>(null)
  const [locked, setLocked] = useState(false)
  useAfter(gold >= 0, 700, onDone)
  const layout = chooseLayout(turn, order)
  const sprites = chooseSprites(turn, order, gold)
  const pick = (c: number) => {
    if (locked || gold >= 0) return
    if (c === turn.right) {
      sfx('correct')
      return setGold(c)
    }
    sfx('wrong')
    setMiss((m) => ({ card: c, n: (m?.n ?? 0) + 1 }))
    setLocked(true)
    window.setTimeout(() => {
      setOrder((o) => (o.length === 2 ? [o[1], o[0]] : [...o.slice(1), o[0]]))
      setLocked(false)
    }, LOCKOUT_MS)
  }
  return (
    <>
      {layout.map((card, i) => (
        <g key={card.card} data-card={card.card} opacity={locked && miss?.card !== card.card ? 0.55 : 1} onPointerDown={() => pick(card.card)}>
          <g key={miss?.card === card.card ? miss.n : 0} style={miss?.card === card.card && locked ? { animation: 'sym-shake 0.45s' } : undefined}>
            <Sprites list={sprites[i]} />
          </g>
        </g>
      ))}
    </>
  )
}

function Place({ turn, onDone }: { turn: PlaceTurn; onDone: () => void }) {
  const layout = placeLayout(turn)
  const [drag, setDrag] = useState<{ g: string; x: number; y: number; moved: boolean; id: number } | null>(null)
  const [filled, setFilled] = useState(false)
  const [miss, setMiss] = useState<{ g: string; n: number } | null>(null)
  const [locked, setLocked] = useState(false)
  useAfter(filled, 800, onDone)
  const answer = (g: string) => {
    if (g === turn.right) {
      sfx('correct')
      return setFilled(true)
    }
    sfx('wrong')
    setMiss((m) => ({ g, n: (m?.n ?? 0) + 1 }))
    setLocked(true)
    window.setTimeout(() => setLocked(false), LOCKOUT_MS)
  }
  const down = (g: string) => (e: RPointerEvent<SVGGElement>) => {
    if (locked || filled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ g, ...at(e), moved: false, id: e.pointerId })
  }
  const move = (e: RPointerEvent<SVGGElement>) => {
    if (!drag || drag.id !== e.pointerId) return
    const p = at(e)
    setDrag({ ...drag, ...p, moved: drag.moved || Math.hypot(p.x - drag.x, p.y - drag.y) > 12 })
  }
  const up = (e: RPointerEvent<SVGGElement>) => {
    if (!drag || drag.id !== e.pointerId) return
    setDrag(null)
    // A tap offers the tile; a drag offers it only if it is let go near the gap.
    if (!drag.moved || Math.hypot(drag.x - layout.gap.x, drag.y - layout.gap.y) < 190) answer(drag.g)
  }
  return (
    <>
      <Sprites list={filled ? placeLine(turn, true).map((s) => (s.d.it?.g === turn.right ? { ...s, n: { ...s.n, gold: 1 } } : s)) : placeLine(turn)} />
      {layout.tiles.map((tile) => {
        if (filled && tile.g === turn.right) return null
        const held = drag?.g === tile.g && drag.moved
        const shaking = miss?.g === tile.g && locked
        return (
          <g key={tile.g} data-tile={tile.g} opacity={filled || (locked && !shaking) ? 0.45 : 1} onPointerDown={down(tile.g)} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)} style={{ touchAction: 'none' }}>
            <g key={shaking ? miss.n : 0} style={shaking ? { animation: 'sym-shake 0.45s' } : undefined}>
              <Sprites list={tileSprites(tile.g, held ? drag.x : tile.x, held ? drag.y : tile.y, { s: held ? 1.08 : 1 })} />
            </g>
            {/* A generous target round the tile. */}
            {!held && <rect x={tile.x - PLACE.tile / 2 - 20} y={tile.y - PLACE.tile / 2 - 20} width={PLACE.tile + 40} height={PLACE.tile + 40} fill="transparent" />}
          </g>
        )
      })}
    </>
  )
}

function Build({ turn, onDone }: { turn: BuildTurn; onDone: () => void }) {
  const max = turn.max ?? turn.target + 4
  const [n, setN] = useState(0)
  const [drag, setDrag] = useState<{ from: 'tray' | 'zone'; x: number; y: number; moved: boolean; id: number } | null>(null)
  const target = useMemo(() => flat(turn.state(n)), [turn, n])
  const shown = useGlide(target)
  const done = n === turn.target
  useAfter(done, 1100, onDone)
  useEffect(() => {
    if (done) sfx('correct')
  }, [done])
  const z = turn.zone
  const inZone = (p: { x: number; y: number }) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h
  const add = () => {
    if (n >= max) return
    cue('bead', n)
    setN(n + 1)
  }
  const take = () => {
    if (n <= 0) return
    cue('slide')
    setN(n - 1)
  }
  const down = (from: 'tray' | 'zone') => (e: RPointerEvent<SVGRectElement>) => {
    if (done || (from === 'zone' && n === 0)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ from, ...at(e), moved: false, id: e.pointerId })
  }
  const move = (e: RPointerEvent<SVGRectElement>) => {
    if (!drag || drag.id !== e.pointerId) return
    const p = at(e)
    setDrag({ ...drag, ...p, moved: drag.moved || Math.hypot(p.x - drag.x, p.y - drag.y) > 12 })
  }
  const up = (e: RPointerEvent<SVGRectElement>) => {
    if (!drag || drag.id !== e.pointerId) return
    setDrag(null)
    // From the tray: a tap puts one on, a drag only if it lands on the pan. From the pan: a tap or a drag off it takes one away.
    if (drag.from === 'tray') {
      if (!drag.moved || inZone(drag)) add()
    } else if (!drag.moved || !inZone(drag)) take()
  }
  const hand = { onPointerMove: move, onPointerUp: up, onPointerCancel: () => setDrag(null), style: { touchAction: 'none' as const } }
  return (
    <>
      <SupplyView unit={turn.unit} empty={turn.supply === 'empty'} />
      <Sprites list={shown} />
      <rect data-zone="" x={z.x} y={z.y} width={z.w} height={z.h} fill="transparent" onPointerDown={down('zone')} {...hand} />
      <rect data-tray="" x={SUPPLY.x - SUPPLY.w / 2 - 30} y={SUPPLY.y - SUPPLY.h / 2 - 40} width={SUPPLY.w + 60} height={SUPPLY.h + 70} fill="transparent" onPointerDown={down('tray')} {...hand} />
      {drag?.moved && <Sprites list={loose(row(turn.unit ?? 1, drag.x, drag.y - 30, 62), { s: 1.5, k: 'held', fade: 0.95 })} />}
    </>
  )
}

/** A read turn: the statement is his to read; a tap (or a few seconds) and the voice reads it. */
function Read({ onDone }: { onDone: () => void }) {
  useAfter(true, 4000, onDone)
  return <rect data-read="" width={W} height={H} fill="transparent" onPointerDown={onDone} />
}

export function TurnOverlay({ turn, onDone }: { turn: Turn; onDone: () => void }) {
  // Whatever he does, it carries on once.
  const went = useRef(false)
  const done = () => {
    if (went.current) return
    went.current = true
    onDone()
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} data-turn={turn.id} data-kind={turn.kind}>
      <style>{SHAKE}</style>
      {turn.kind === 'predict' && <Predict turn={turn} onDone={done} />}
      {turn.kind === 'choose' && <Choose turn={turn} onDone={done} />}
      {turn.kind === 'place' && <Place turn={turn} onDone={done} />}
      {turn.kind === 'build' && <Build turn={turn} onDone={done} />}
      {turn.kind === 'read' && <Read onDone={done} />}
    </svg>
  )
}
