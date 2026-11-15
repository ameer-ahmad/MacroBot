import { useState } from 'react'
import { Plus } from 'lucide-react'
import { TrendsSection } from '@/components/dashboard/TrendsSection'
import { WeightCard } from '@/components/dashboard/WeightCard'
import { AdjustmentBanner } from '@/components/dashboard/AdjustmentBanner'
import { DevAdjustmentSimulator } from '@/components/dashboard/DevAdjustmentSimulator'
import { AddFoodFlow } from '@/components/log/AddFoodFlow'
import { MacroSummary, NutritionProgress } from '@/components/log/NutritionSummary'
import { useDailyTotals } from '@/hooks/useLogEntries'
import { useProfile } from '@/hooks/useProfile'
import { useWeeklyAdjustment } from '@/hooks/useWeeklyAdjustment'
import { calorieBalanceLabel, toDateString } from '@/lib/macros'

export function DashboardPage() {
  const [addDate, setAddDate] = useState<string | null>(null)
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { totals, isLoading: logLoading } = useDailyTotals()
  const adjustment = useWeeklyAdjustment()

  const goals = {
    calories: profile?.calorie_goal ?? 2000,
    protein_g: profile?.protein_goal ?? 150,
    carbs_g: profile?.carbs_goal ?? 200,
    fats_g: profile?.fats_goal ?? 65,
    fiber_g: profile?.fiber_goal ?? 30,
  }

  const daily = totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0 }
  const isLoading = profileLoading || (logLoading && !totals)

  return (
    <div className="space-y-6">
      <section aria-labelledby="dashboard-today" className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="space-y-4 bg-linear-to-b from-accent/60 to-card px-4 pt-4 pb-5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="dashboard-today" className="text-2xl font-bold tracking-tight text-foreground">Today</h2>
            <button
              type="button"
              onClick={() => setAddDate(toDateString())}
              className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Log food
            </button>
          </div>
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <p className="text-sm font-medium text-muted">
                <span className="mr-1 text-4xl font-bold leading-none tracking-tight tabular-nums text-foreground sm:text-5xl">
                  {isLoading ? '…' : Math.round(daily.calories).toLocaleString()}
                </span>{' '}
                kcal logged
              </p>
              <p className="text-xs text-muted sm:text-sm">Goal {goals.calories.toLocaleString()} kcal</p>
            </div>
            <div className="mt-3">
              <NutritionProgress current={isLoading ? 0 : daily.calories} goal={goals.calories} />
            </div>
            <p className="mt-2 text-sm font-medium text-primary">
              {isLoading ? 'Loading daily totals…' : calorieBalanceLabel(daily.calories, goals.calories)}
            </p>
          </div>
        </div>
        <div className="border-t border-border px-4 py-4 sm:px-5">
          <MacroSummary values={daily} goals={goals} loading={isLoading} />
        </div>
      </section>

      {profile &&
        adjustment &&
        (adjustment.status === 'suggest' || adjustment.status === 'not_followed') && (
          <AdjustmentBanner result={adjustment} profile={profile} />
        )}

      <WeightCard />

      <TrendsSection />

      {import.meta.env.DEV && profile && <DevAdjustmentSimulator profile={profile} />}
      {addDate && <AddFoodFlow date={addDate} onClose={() => setAddDate(null)} />}
    </div>
  )
}
