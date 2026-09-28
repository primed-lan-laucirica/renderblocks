import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Profile } from './model'

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-sm ${className}`} style={style}>
      {children}
    </div>
  )
}

export function Button({
  children,
  onClick,
  kind = 'plain',
  className = '',
  disabled,
  label,
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'plain' | 'primary' | 'danger' | 'ghost'
  className?: string
  disabled?: boolean
  label?: string
}) {
  const look = {
    plain: 'bg-[var(--card)] border border-[var(--line)] text-[var(--ink)]',
    primary: 'bg-[var(--accent)] text-[var(--on-accent)] border border-transparent',
    danger: 'bg-rose-600 text-white border border-transparent',
    ghost: 'bg-transparent text-[var(--ink)] border border-transparent',
  }[kind]
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 font-bold active:scale-95 transition-transform disabled:opacity-40 ${look} ${className}`}
    >
      {children}
    </button>
  )
}

/** A full-screen sheet over the app. */
export function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-3" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} max-h-full overflow-y-auto rounded-3xl bg-[var(--bg)] text-[var(--ink)] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-3 bg-[var(--bg)] border-b border-[var(--line)]">
          <h2 className="text-xl font-black flex-1">{title}</h2>
          <Button kind="ghost" onClick={onClose} label="Close" className="text-2xl">
            ✕
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Dot({ colour, size = 12 }: { colour: string; size?: number }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: colour }} />
}

/** People chips: tap to choose (one or several). */
export function PeoplePicker({ profiles, value, onChange, single }: { profiles: Profile[]; value: string[]; onChange: (v: string[]) => void; single?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {profiles.map((p) => {
        const on = value.includes(p.id)
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(single ? [p.id] : on ? value.filter((v) => v !== p.id) : [...value, p.id])}
            className="rounded-full px-4 py-2 font-bold border-2"
            style={{ borderColor: p.colour, background: on ? p.colour : 'transparent', color: on ? 'white' : p.colour }}
          >
            {p.name}
          </button>
        )
      })}
    </div>
  )
}

/**
 * A big number pad (spec 3: times are typed, not spun). `format` shapes
 * the digits typed so far into what is shown; `done` gets the digits.
 */
export function NumberPad({ title, digits, max, onDone, onCancel, show }: { title: string; digits: string; max: number; onDone: (d: string) => void; onCancel: () => void; show?: (d: string) => string }) {
  const [d, setD] = useState(digits)
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-xs rounded-3xl bg-[var(--bg)] text-[var(--ink)] p-4 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="text-center font-bold text-[var(--muted)]">{title}</div>
        <div className="text-center text-4xl font-black tabular-nums rounded-2xl bg-[var(--card)] py-3 min-h-16">{show ? show(d) : d || '–'}</div>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (k === '⌫') setD((x) => x.slice(0, -1))
                else if (k === 'OK') onDone(d)
                else setD((x) => (x.length < max ? x + k : x))
              }}
              className={`h-14 rounded-2xl text-2xl font-black ${k === 'OK' ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--card)]'}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** A time field that opens the number pad: type 1 9 3 0 for 19:30. */
export function TimeField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const show = (d: string) => {
    const p = d.padStart(4, '_')
    return `${p.slice(0, 2)}:${p.slice(2)}`.replace(/_/g, '–')
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-2xl bg-[var(--card)] border border-[var(--line)] px-4 py-2 font-black text-xl tabular-nums">
        {value || '––:––'}
      </button>
      {open && (
        <NumberPad
          title={`${label} (24-hour: 1 9 3 0 is 7:30 PM)`}
          digits={value.replace(':', '')}
          max={4}
          show={show}
          onCancel={() => setOpen(false)}
          onDone={(d) => {
            setOpen(false)
            const p = d.padStart(4, '0')
            const h = Math.min(23, Number(p.slice(0, 2)))
            const m = Math.min(59, Number(p.slice(2)))
            onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
          }}
        />
      )}
    </>
  )
}

/** Parent PIN: set it the first time, then enter it (spec 14). */
export function PinGate({ pin, onOpen, onSet, onCancel }: { pin?: string; onOpen: () => void; onSet: (pin: string) => void; onCancel: () => void }) {
  const [first, setFirst] = useState<string | null>(null)
  const [wrong, setWrong] = useState(false)
  const title = pin ? (wrong ? 'Wrong PIN — try again' : 'Parent PIN') : first === null ? 'Choose a 4-digit parent PIN' : 'Type the new PIN again'
  return (
    <NumberPad
      key={`${first}-${wrong}`}
      title={title}
      digits=""
      max={4}
      show={(d) => '●'.repeat(d.length) || '–'}
      onCancel={onCancel}
      onDone={(d) => {
        if (d.length !== 4) return
        if (pin) {
          if (d === pin) onOpen()
          else setWrong(true)
        } else if (first === null) setFirst(d)
        else if (d === first) onSet(d)
        else setFirst(null)
      }}
    />
  )
}
