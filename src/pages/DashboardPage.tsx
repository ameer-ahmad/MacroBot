import { Flame, Beef, Wheat, Droplets, Leaf } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'

function formatGoal(value: number, suffix = '') {
  return `${Math.round(value).toLocaleString()}${suffix}`
}

export function DashboardPage() {
  const { data: profile, isLoading } = useProfile()

  const goals = {
    calories: profile?.calorie_goal ?? 2000,
    protein: profile?.protein_goal ?? 150,
    carbs: profile?.carbs_goal ?? 200,
    fats: profile?.fats_goal ?? 65,
    fiber: profile?.fiber_goal ?? 30,
  }

  const macroCards = [
    { label: 'Calories', value: '0', goal: formatGoal(goals.calories), icon: Flame, color: 'text-primary' },
    { label: 'Protein', value: '0g', goal: `${formatGoal(goals.protein)}g`, icon: Beef, color: 'text-protein' },
    { label: 'Carbs', value: '0g', goal: `${formatGoal(goals.carbs)}g`, icon: Wheat, color: 'text-carbs' },
    { label: 'Fats', value: '0g', goal: `${formatGoal(goals.fats)}g`, icon: Droplets, color: 'text-fats' },
    { label: 'Fiber', value: '0g', goal: `${formatGoal(goals.fiber)}g`, icon: Leaf, color: 'text-fiber' },
  ] as const

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-foreground">
          {profile?.name ? `Hi, ${profile.name}` : 'Today'}
        </h2>
        <p className="text-sm text-muted">Track your daily nutrition goals</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-medium text-muted">Calories remaining</p>
        <p className="mt-1 text-4xl font-bold text-foreground">
          {isLoading ? '…' : formatGoal(goals.calories)}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full w-0 rounded-full bg-primary transition-all duration-300" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {macroCards.slice(1).map(({ label, value, goal, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
              <span className="text-sm font-medium text-muted">{label}</span>
            </div>
            <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
            <p className="text-xs text-muted">of {goal}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
