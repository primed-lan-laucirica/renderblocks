import { useEffect, useRef, useState } from 'react'
import { AnalogClock, Wedge } from './Clock'
import { clock12, numberWords } from './model'
import { playEffect } from './sounds'
import { Button } from './ui'

const CHOICES = [1, 2, 3, 5, 10, 15, 20, 30]

/**
 * The visual timer (spec 10): a shrinking wedge, the time left in digits
 * and in words, and an analog clock showing when it will be done.
 */
export function Timer({ onClose }: { onClose: () => void }) {
  const [total, setTotal] = useState<number | null>(null)
  const [endAt, setEndAt] = useState(0)
  const [pausedLeft, setPausedLeft] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const rang = useRef(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  const left = total === null ? 0 : pausedLeft ?? Math.max(0, endAt - now)
  const done = total !== null && left <= 0
  useEffect(() => {
    if (done && !rang.current) {
      rang.current = true
      playEffect('cheer')
    }
  }, [done])

  const start = (mins: number) => {
    rang.current = false
    setTotal(mins * 60_000)
    setPausedLeft(null)
    setEndAt(now + mins * 60_000)
  }

  const secs = Math.ceil(left / 1000)
  const mm = Math.floor(secs / 60)
  const ss = secs % 60
  const end = new Date(endAt)
  const words = mm >= 1 ? `${numberWords(mm + (ss > 0 ? 1 : 0))} minutes left`.replace(/^one minutes/, 'one minute') : `${numberWords(ss)} seconds left`.replace(/^one seconds/, 'one second')

  return (
    <div className="fixed inset-0 z-40 bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center justify-center gap-6 p-6">
      <Button kind="ghost" onClick={onClose} className="absolute top-4 right-4 text-3xl" label="Close timer">
        ✕
      </Button>
      {total === null ? (
        <>
          <h2 className="text-4xl font-black">How long?</h2>
          <div className="grid grid-cols-4 gap-3">
            {CHOICES.map((m) => (
              <Button key={m} onClick={() => start(m)} className="w-28 h-24 text-3xl tabular-nums">
                {m} min
              </Button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-center gap-10">
            <div className="relative">
              <Wedge left={left} total={total} size={300} colour={done ? '#f59e0b' : '#0f766e'} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-8xl font-black tabular-nums">
                {mm}:{String(ss).padStart(2, '0')}
              </div>
              <div className="text-3xl font-black text-[var(--muted)]">{done ? "Time's up!" : words}</div>
              <div className="flex items-center gap-3 mt-2">
                <AnalogClock h={end.getHours()} m={end.getMinutes()} size={120} minuteNumbers={false} />
                <div className="text-2xl font-black tabular-nums">Done at {clock12(end.getHours(), end.getMinutes())}</div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {!done && (
              <Button
                className="text-2xl px-6"
                onClick={() => {
                  if (pausedLeft === null) setPausedLeft(left)
                  else {
                    setEndAt(now + pausedLeft)
                    setPausedLeft(null)
                  }
                }}
              >
                {pausedLeft === null ? '⏸ Pause' : '▶ Go'}
              </Button>
            )}
            <Button className="text-2xl px-6" onClick={() => setTotal(null)}>
              New timer
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
