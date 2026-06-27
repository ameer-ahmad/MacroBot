import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddFoodFlow } from '@/components/log/AddFoodFlow'
import { DateNavigator, TodayButton } from '@/components/log/DateNavigator'
import { EditLogEntryModal } from '@/components/log/EditLogEntryModal'
import { MacroProgressBar } from '@/components/log/MacroProgressBar'
import { useDailyTotals } from '@/hooks/useLogEntries'
import { useProfile } from '@/hooks/useProfile'
import { MEAL_LABELS, MEAL_ORDER, sumMacros } from '@/lib/api'
import { macroRemaining, toDateString } from '@/lib/macros'
import type { LogEntry, MealType } from '@/types/database'
import { formatMacro } from '@/types/food'

export function LogPage() {
  const [date, setDate] = useState(toDateString())
  const [addMeal, setAddMeal] = useState<MealType | null>(null)
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null)

  const { data: profile } = useProfile()
  const { data: entries = [], isLoading, totals } = useDailyTotals(date)

  const goals = {
    calories: profile?.calorie_goal ?? 2000,
    protein: profile?.protein_goal ?? 150,
    carbs: profile?.carbs_goal ?? 200,
    fats: profile?.fats_goal ?? 65,
    fiber: profile?.fiber_goal ?? 30,
  }

  const daily = totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0 }
  const isToday = date === toDateString()

  const entriesByMeal = MEAL_ORDER.reduce(
    (acc, meal) => {
      acc[meal] = entries.filter((e) => e.meal === meal)
      return acc
    },
    {} as Record<MealType, LogEntry[]>,
  )

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Food Log</h2>
          <p className="text-sm text-muted">Log what you eat throughout the day</p>
        </div>
        {!isToday && <TodayButton onClick={() => setDate(toDateString())} />}
      </section>

      <DateNavigator date={date} onChange={setDate} />

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-foreground">Daily totals</h3>
        <p className="text-2xl font-bold text-foreground">
          {formatMacro(daily.calories, 'kcal')}
          <span className="ml-2 text-sm font-normal text-muted">
            · {Math.round(macroRemaining(daily.calories, goals.calories))} kcal remaining
          </span>
        </p>
        <MacroProgressBar label="Calories" current={daily.calories} goal={goals.calories} unit="kcal" />
        <MacroProgressBar
          label="Protein"
          current={daily.protein_g}
          goal={goals.protein}
          colorClass="bg-protein"
        />
        <MacroProgressBar
          label="Carbs"
          current={daily.carbs_g}
          goal={goals.carbs}
          colorClass="bg-carbs"
        />
        <MacroProgressBar
          label="Fats"
          current={daily.fats_g}
          goal={goals.fats}
          colorClass="bg-fats"
        />
        <MacroProgressBar
          label="Fiber"
          current={daily.fiber_g}
          goal={goals.fiber}
          colorClass="bg-fiber"
        />
      </section>

      {isLoading && <p className="text-sm text-muted">Loading log…</p>}

      <div className="space-y-4">
        {MEAL_ORDER.map((meal) => {
          const mealEntries = entriesByMeal[meal]
          const mealTotals = sumMacros(mealEntries)

          return (
            <section
              key={meal}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{MEAL_LABELS[meal]}</h3>
                  {mealEntries.length > 0 && (
                    <p className="text-xs text-muted">
                      {formatMacro(mealTotals.calories, 'kcal')} · P {mealTotals.protein_g}g
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAddMeal(meal)}
                  className="flex cursor-pointer items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add
                </button>
              </div>

              {mealEntries.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No items logged yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {mealEntries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => setEditingEntry(entry)}
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left transition-colors duration-200 hover:border-primary hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{entry.name}</p>
                          <p className="text-xs text-muted">
                            {entry.quantity} × {entry.serving_unit}
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

      {editingEntry && (
        <EditLogEntryModal
          entry={editingEntry}
          date={date}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  )
}
