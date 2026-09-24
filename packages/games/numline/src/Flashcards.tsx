import { motion } from 'framer-motion'
import { DECKS, type Card, type DeckId } from './decks'

interface FlashcardsProps {
  deck: DeckId
  onDeck: (id: DeckId) => void
  card: Card | null
  /** Filled in once he presses equals — the card "turns over". */
  revealed: boolean
  index: number
  total: number
  onNext: () => void
  dark: boolean
}

/**
 * Replaces the number line when the Flashcards tab is active. The card is the
 * prompt only — he transcribes it into the keypad and the calculator does the
 * arithmetic, which is how he already works through a physical deck. Pressing
 * equals turns the card over to show the answer.
 */
export function Flashcards({
  deck,
  onDeck,
  card,
  revealed,
  index,
  total,
  onNext,
  dark,
}: FlashcardsProps) {
  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="w-full max-w-md flex items-center justify-between gap-2">
        <select
          value={deck}
          onChange={(e) => onDeck(e.target.value as DeckId)}
          className={`flex-1 min-w-0 text-sm font-extrabold rounded-xl px-3 py-2 border-2 ${
            dark
              ? 'bg-slate-800 text-orange-300 border-orange-700'
              : 'bg-white text-orange-700 border-orange-300'
          }`}
        >
          {DECKS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <span className={`text-sm font-extrabold tabular-nums ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          {index + 1}/{total}
        </span>
      </div>

      <motion.button
        type="button"
        onPointerDown={onNext}
        whileTap={{ scale: 0.97 }}
        style={{ touchAction: 'manipulation' }}
        className={`w-full max-w-md rounded-3xl border-4 flex items-center justify-center px-4 py-8 min-h-[9rem] ${
          dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200 shadow-playful'
        }`}
      >
        {card ? (
          <span
            className={`text-5xl sm:text-6xl font-extrabold tabular-nums tracking-tight ${
              dark ? 'text-slate-100' : 'text-slate-700'
            }`}
          >
            {card.a} {card.op} {card.b} ={' '}
            {revealed ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                className={dark ? 'text-teal-300' : 'text-teal-600'}
              >
                {card.answer}
              </motion.span>
            ) : (
              <span className={dark ? 'text-slate-600' : 'text-slate-300'}>?</span>
            )}
          </span>
        ) : (
          <span className={`text-xl font-bold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            Deck finished — tap for more
          </span>
        )}
      </motion.button>

      <span className={`text-xs font-bold ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
        {revealed ? 'tap the card for the next one' : 'type it on the keypad, then ='}
      </span>
    </div>
  )
}
