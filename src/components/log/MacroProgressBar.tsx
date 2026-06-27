export function MacroProgressBar({
  label,
  current,
  goal,
  unit = 'g',
  colorClass = 'bg-primary',
}: {
  label: string
  current: number
  goal: number
  unit?: string
  colorClass?: string
}) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0
  const display = unit === 'kcal' ? Math.round(current) : Math.round(current * 10) / 10
  const goalDisplay = unit === 'kcal' ? Math.round(goal) : goal

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-foreground">
          {display}{unit === 'kcal' ? '' : unit} / {goalDisplay}{unit === 'kcal' ? '' : unit}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
