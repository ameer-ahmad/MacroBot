import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, X } from 'lucide-react'
import { invalidateFoodLog } from '@/hooks/useLogEntries'
import { deleteLogEntry, MEAL_LABELS, MEAL_ORDER, updateLogEntry } from '@/lib/api'
import { amountFieldConfig, macrosPerUnit, scaleMacros } from '@/lib/macros'
import type { LogEntry, MealType } from '@/types/database'
import { formatMacro } from '@/types/food'

const inputClass =
  'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function EditLogEntryModal({
  entry,
  onClose,
}: {
  entry: LogEntry
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [meal, setMeal] = useState<MealType>(entry.meal)
  const [quantity, setQuantity] = useState(String(entry.quantity))
  const [error, setError] = useState<string | null>(null)

  const field = amountFieldConfig(entry.serving_unit)
  const perUnit = macrosPerUnit(entry)
  const qty = Number(quantity) || 1
  const preview = scaleMacros(perUnit, qty)

  const invalidate = () => {
    void invalidateFoodLog(queryClient)
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      updateLogEntry(entry.id, {
        meal,
        quantity: qty,
        ...preview,
      }),
    onSuccess: () => {
      invalidate()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Update failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteLogEntry(entry.id),
    onSuccess: () => {
      invalidate()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Delete failed'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:items-center sm:pb-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl" role="dialog">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{entry.name}</h3>
            <p className="text-sm text-muted">{entry.serving_unit}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-muted hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && <p className="text-sm text-fats">{error}</p>}

          <div>
            <span className="mb-1.5 block text-sm font-medium text-foreground">Meal</span>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_ORDER.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMeal(m)}
                  className={[
                    'cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium',
                    meal === m ? 'border-primary bg-accent text-primary' : 'border-border text-muted',
                  ].join(' ')}
                >
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-foreground">{field.label}</span>
            <input
              type="number"
              min={field.min}
              step={field.step}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
            <span className="mt-1 block text-xs text-muted">
              Nutrition scales with the amount you enter.
            </span>
          </label>

          <p className="text-sm text-muted">
            {formatMacro(preview.calories, 'kcal')} · P {preview.protein_g}g · C {preview.carbs_g}g · F{' '}
            {preview.fats_g}g
          </p>

          <button
            type="button"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>

          <button
            type="button"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-fats/30 px-4 py-3 text-sm font-medium text-fats transition-colors duration-200 hover:bg-fats/10"
          >
            <Trash2 className="h-4 w-4" />
            {deleteMutation.isPending ? 'Deleting…' : 'Delete entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
