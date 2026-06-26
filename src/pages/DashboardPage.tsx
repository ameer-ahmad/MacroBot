import { Flame, Beef, Wheat, Droplets, Leaf } from 'lucide-react'

const macroCards = [
  { label: 'Calories', value: '0', goal: '2,000', icon: Flame, color: 'text-primary' },
  { label: 'Protein', value: '0g', goal: '150g', icon: Beef, color: 'text-protein' },
  { label: 'Carbs', value: '0g', goal: '200g', icon: Wheat, color: 'text-carbs' },
  { label: 'Fats', value: '0g', goal: '65g', icon: Droplets, color: 'text-fats' },
  { label: 'Fiber', value: '0g', goal: '30g', icon: Leaf, color: 'text-fiber' },
] as const

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-foreground">Today</h2>
        <p className="text-sm text-muted">Track your daily nutrition goals</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-medium text-muted">Calories remaining</p>
        <p className="mt-1 text-4xl font-bold text-foreground">2,000</p>
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
