import { Flame, Beef, Wheat, Droplets, Leaf } from 'lucide-react'
import { TrendsSection } from '@/components/dashboard/TrendsSection'
import { WeightCard } from '@/components/dashboard/WeightCard'
import { AdjustmentBanner } from '@/components/dashboard/AdjustmentBanner'
import { DevAdjustmentSimulator } from '@/components/dashboard/DevAdjustmentSimulator'
import { MacroProgressBar } from '@/components/log/MacroProgressBar'
import { useDailyTotals } from '@/hooks/useLogEntries'
import { useProfile } from '@/hooks/useProfile'
import { useWeeklyAdjustment } from '@/hooks/useWeeklyAdjustment'
import { macroRemaining } from '@/lib/macros'
import { formatMacro } from '@/types/food'

function formatGoal(value: number, suffix = '') {
  return `${Math.round(value).toLocaleString()}${suffix}`
}

export function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { totals, isLoading: logLoading } = useDailyTotals()
  const adjustment = useWeeklyAdjustment()

  const goals = {
    calories: profile?.calorie_goal ?? 2000,
    protein: profile?.protein_goal ?? 150,
    carbs: profile?.carbs_goal ?? 200,
    fats: profile?.fats_goal ?? 65,
    fiber: profile?.fiber_goal ?? 30,
  }

  const daily = totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0 }
  const remaining = macroRemaining(daily.calories, goals.calories)
  const isLoading = profileLoading || logLoading

  const macroCards = [
    { label: 'Protein', value: daily.protein_g, goal: goals.protein, icon: Beef, color: 'text-protein', bar: 'bg-protein' },
    { label: 'Carbs', value: daily.carbs_g, goal: goals.carbs, icon: Wheat, color: 'text-carbs', bar: 'bg-carbs' },
    { label: 'Fats', value: daily.fats_g, goal: goals.fats, icon: Droplets, color: 'text-fats', bar: 'bg-fats' },
    { label: 'Fiber', value: daily.fiber_g, goal: goals.fiber, icon: Leaf, color: 'text-fiber', bar: 'bg-fiber' },
  ] as const

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-foreground">
          {profile?.name ? `Hi, ${profile.name}` : 'Today'}
        </h2>
        <p className="text-sm text-muted">Track your daily nutrition goals</p>
      </section>

      {profile &&
        adjustment &&
        (adjustment.status === 'suggest' || adjustment.status === 'not_followed') && (
          <AdjustmentBanner result={adjustment} profile={profile} />
        )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-muted">Calories remaining</p>
        </div>
        <p className="mt-1 text-4xl font-bold text-foreground">
          {isLoading ? '…' : formatGoal(remaining)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {isLoading ? '…' : `${formatMacro(daily.calories, 'kcal')} eaten of ${formatGoal(goals.calories)}`}
        </p>
        <div className="mt-4">
          <MacroProgressBar
            label=""
            current={daily.calories}
            goal={goals.calories}
            unit="kcal"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {macroCards.map(({ label, value, goal, icon: Icon, color, bar }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
              <span className="text-sm font-medium text-muted">{label}</span>
            </div>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {isLoading ? '…' : `${formatMacro(value)}`}
            </p>
            <p className="text-xs text-muted">of {formatGoal(goal)}g</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full transition-all duration-300 ${bar}`}
                style={{ width: `${goal > 0 ? Math.min(100, (value / goal) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      <WeightCard />

      <TrendsSection />

      {import.meta.env.DEV && profile && <DevAdjustmentSimulator profile={profile} />}
    </div>
  )
}
