import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Trash2, X } from 'lucide-react'
import { MEAL_LABELS, MEAL_ORDER, sumMacros } from '@/lib/api'
import { macrosPerUnit, parseDateString, scaleMacros, shiftDate, toDateString } from '@/lib/macros'
import { queueLogEntries, type PendingPayload } from '@/lib/offlineQueue'
import { useAuth } from '@/providers/AuthProvider'
import type { LogEntry, MealType } from '@/types/database'
import { formatMacro } from '@/types/food'

const destinationField =
  'mt-1 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 py-2 text-base text-foreground dark:[color-scheme:dark]'

export function CopyMealDialog({ sourceDate, sourceMeal, entries, onCopied, onClose }: {
  sourceDate: string
  sourceMeal: MealType
  entries: LogEntry[]
  onCopied: (date: string) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const userId = useAuth().user?.id ?? ''
  const today = toDateString()
  const [destinationDate, setDestinationDate] = useState(() => sourceDate === today ? shiftDate(today, 1) : today)
  const [destinationMeal, setDestinationMeal] = useState(sourceMeal)
  const [items, setItems] = useState(() => entries.map((entry) => ({ entry, amount: String(entry.quantity) })))

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  const amountsValid = items.every(({ amount }) => Number(amount) >= 0.001 && Number(amount) < 10_000_000)
  const canCopy = Boolean(destinationDate && items.length && amountsValid)
  const payloads = items.map(({ entry, amount }) => {
    const quantity = Number(amount)
    const macros = quantity === Number(entry.quantity) ? entry : scaleMacros(macrosPerUnit(entry), quantity)
    return {
      logged_date: destinationDate,
      meal: destinationMeal,
      name: entry.name,
      food_id: entry.food_id,
      quantity,
      serving_unit: entry.serving_unit,
      notes: entry.notes,
      calories: macros.calories,
      protein_g: macros.protein_g,
      carbs_g: macros.carbs_g,
      fats_g: macros.fats_g,
      fiber_g: macros.fiber_g,
    }
  })
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: async (batch: PendingPayload[]) => queueLogEntries(userId, batch),
    onSuccess: (_, batch) => onCopied(batch[0].logged_date),
  })

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      aria-labelledby="copy-meal-title"
      className="fixed inset-x-0 bottom-0 top-auto mx-auto max-h-[90dvh] w-full max-w-lg rounded-t-2xl border border-border bg-card text-foreground shadow-xl backdrop:bg-foreground/40 sm:inset-y-0 sm:my-auto sm:rounded-2xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 id="copy-meal-title" className="text-lg font-semibold">Copy {MEAL_LABELS[sourceMeal].toLowerCase()}</h3>
          <p className="text-sm text-muted">From {parseDateString(sourceDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-11 cursor-pointer place-items-center rounded-lg text-muted hover:bg-accent"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <form
        className="space-y-4 px-5 pt-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault()
          if (canCopy && !mutation.isPending) mutation.mutate(payloads)
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="min-w-0 text-sm font-medium">
            Destination date
            <input
              type="date"
              value={destinationDate}
              onChange={(event) => setDestinationDate(event.target.value)}
              className={destinationField}
              required
            />
          </label>
          <label className="min-w-0 text-sm font-medium">
            Destination meal
            <select
              value={destinationMeal}
              onChange={(event) => setDestinationMeal(event.target.value as MealType)}
              className={destinationField}
            >
              {MEAL_ORDER.map((meal) => (
                <option key={meal} value={meal}>{MEAL_LABELS[meal]}</option>
              ))}
            </select>
          </label>
        </div>
        <ul className="space-y-2">
          {items.map(({ entry, amount }, index) => (
            <li key={entry.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{entry.name}</p>
                <p className="text-xs text-muted">{formatMacro(payloads[index].calories, 'kcal')}</p>
              </div>
              <label className="w-24 shrink-0 text-xs text-muted">
                {entry.serving_unit}
                <input
                  type="number"
                  min="0.001"
                  max="9999999.999"
                  step="0.001"
                  required
                  aria-label={`Amount for ${entry.name} (${entry.serving_unit})`}
                  value={amount}
                  onChange={(event) => {
                    const value = event.target.value
                    setItems((previous) => previous.map((item) => item.entry.id === entry.id ? { ...item, amount: value } : item))
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-base text-foreground"
                />
              </label>
              <button
                type="button"
                aria-label={`Remove ${entry.name} from copy`}
                onClick={() => setItems((previous) => previous.filter((item) => item.entry.id !== entry.id))}
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted hover:bg-accent hover:text-fats"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {items.length === 0 && <p className="text-sm text-muted">No items selected.</p>}
        {items.length > 0 && amountsValid && (
          <p className="text-sm text-muted">{formatMacro(sumMacros(payloads).calories, 'kcal')} total</p>
        )}
        {mutation.error && <p className="text-sm text-fats" role="alert">{mutation.error.message}</p>}
        <button
          type="submit"
          disabled={!canCopy || mutation.isPending}
          className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? 'Copying…' : 'Copy meal'}
        </button>
      </form>
    </dialog>
  )
}
