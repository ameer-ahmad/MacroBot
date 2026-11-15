import { useState } from 'react'
import { ChevronDown, Copy, Plus, Trash2 } from 'lucide-react'
import { AddFoodFlow } from '@/components/log/AddFoodFlow'
import { CopyMealDialog } from '@/components/log/CopyMealDialog'
import { DateNavigator } from '@/components/log/DateNavigator'
import { DeleteMealDialog } from '@/components/log/DeleteMealDialog'
import { EditLogEntryModal } from '@/components/log/EditLogEntryModal'
import { MacroSummary, NutritionProgress } from '@/components/log/NutritionSummary'
import { useDailyTotals } from '@/hooks/useLogEntries'
import { useProfile } from '@/hooks/useProfile'
import { MEAL_LABELS, MEAL_ORDER, sumMacros } from '@/lib/api'
import { calorieBalanceLabel, toDateString } from '@/lib/macros'
import type { DisplayLogEntry } from '@/lib/offlineQueue'
import type { LogEntry, MealType } from '@/types/database'
import { formatMacro } from '@/types/food'

export function LogPage() {
  const [date, setDate] = useState(toDateString())
  const [addMeal, setAddMeal] = useState<MealType | null>(null)
  const [copyMeal, setCopyMeal] = useState<MealType | null>(null)
  const [deletingMeal, setDeletingMeal] = useState<MealType | null>(null)
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null)
  const [showTotals, setShowTotals] = useState(false)

  const { data: profile } = useProfile()
  const { data: entries = [], isLoading, totals } = useDailyTotals(date)

  const goals = {
    calories: profile?.calorie_goal ?? 2000,
    protein_g: profile?.protein_goal ?? 150,
    carbs_g: profile?.carbs_goal ?? 200,
    fats_g: profile?.fats_goal ?? 65,
    fiber_g: profile?.fiber_goal ?? 30,
  }

  const daily = totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0 }
  const loading = isLoading && !totals

  const entriesByMeal = MEAL_ORDER.reduce(
    (acc, meal) => {
      acc[meal] = entries.filter((e) => e.meal === meal)
      return acc
    },
    {} as Record<MealType, DisplayLogEntry[]>,
  )

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">Food Log</h2>

      <div className="sticky top-(--app-header-height) z-20 bg-background py-1">
        <DateNavigator date={date} onChange={setDate} />
      </div>

      <section aria-label="Daily totals" className="rounded-2xl border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setShowTotals(!showTotals)}
          aria-expanded={showTotals}
          aria-controls="log-daily-totals"
          className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-t-2xl px-3 py-2.5 text-left hover:bg-accent/40 sm:px-4"
        >
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold tabular-nums text-foreground">{loading ? '…' : formatMacro(daily.calories, 'kcal')}</span>
            <span className="text-xs text-muted sm:text-sm">{loading ? 'Loading log…' : calorieBalanceLabel(daily.calories, goals.calories)}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${showTotals ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <div id="log-daily-totals" className="space-y-3 px-3 pb-3 sm:px-4">
          {showTotals && (
            <div>
              <p className="mb-1.5 text-xs text-muted">Goal {goals.calories.toLocaleString()} kcal</p>
              <NutritionProgress current={daily.calories} goal={goals.calories} />
            </div>
          )}
          <MacroSummary values={daily} goals={showTotals ? goals : undefined} loading={loading} />
        </div>
      </section>

      <div className="space-y-3">
        {MEAL_ORDER.map((meal) => {
          const mealEntries = entriesByMeal[meal]
          const mealTotals = sumMacros(mealEntries)
          const mealLabel = MEAL_LABELS[meal]
          const copyLabel = `Copy ${mealLabel.toLowerCase()}`

          return (
            <section
              key={meal}
              className="rounded-2xl border border-border bg-card shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">{mealLabel}</h3>
                  <p className="text-xs text-muted">
                    {mealEntries.length > 0
                      ? `${formatMacro(mealTotals.calories, 'kcal')} · ${formatMacro(mealTotals.protein_g)} protein`
                      : loading ? 'Loading…' : 'No items logged'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {mealEntries.length > 0 && (
                    <button
                      type="button"
                      aria-label={`Delete ${mealLabel.toLowerCase()}`}
                      title={`Delete ${mealLabel.toLowerCase()}`}
                      onClick={() => setDeletingMeal(meal)}
                      className="grid size-11 cursor-pointer place-items-center rounded-lg text-muted hover:bg-fats/10 hover:text-fats"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={copyLabel}
                    title={copyLabel}
                    disabled={mealEntries.length === 0}
                    onClick={() => setCopyMeal(meal)}
                    className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted enabled:cursor-pointer enabled:hover:bg-accent enabled:hover:text-foreground disabled:opacity-40"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    <span className="max-[359px]:sr-only">Copy</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Add food to ${mealLabel.toLowerCase()}`}
                    onClick={() => setAddMeal(meal)}
                    className="flex min-h-11 cursor-pointer items-center gap-1 rounded-lg bg-accent px-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add
                  </button>
                </div>
              </div>

              {mealEntries.length > 0 && (
                <ul className="divide-y divide-border rounded-b-2xl border-t border-border">
                  {mealEntries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => setEditingEntry(entry)}
                        disabled={Boolean(entry.__pending)}
                        className={[
                          'flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-200 sm:px-4',
                          entry.__pending
                            ? 'cursor-default opacity-70'
                            : 'cursor-pointer hover:bg-accent',
                        ].join(' ')}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{entry.name}</p>
                          <p className="text-xs text-muted">
                            {entry.__pending === 'failed'
                              ? 'Saved on this device · needs sync'
                              : entry.__pending
                                ? 'Saved on this device · pending sync'
                                  : `${entry.quantity} ${entry.serving_unit}`}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-medium text-foreground">
                          {formatMacro(Number(entry.calories), 'kcal')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {addMeal && (
        <AddFoodFlow
          date={date}
          initialMeal={addMeal}
          onClose={() => setAddMeal(null)}
        />
      )}

      {copyMeal && (
        <CopyMealDialog
          sourceDate={date}
          sourceMeal={copyMeal}
          entries={entriesByMeal[copyMeal]}
          onClose={() => setCopyMeal(null)}
          onCopied={(destinationDate) => {
            setCopyMeal(null)
            setDate(destinationDate)
          }}
        />
      )}

      {editingEntry && (
        <EditLogEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {deletingMeal && (
        <DeleteMealDialog
          date={date}
          meal={deletingMeal}
          entries={entriesByMeal[deletingMeal]}
          onClose={() => setDeletingMeal(null)}
        />
      )}
    </div>
  )
}
