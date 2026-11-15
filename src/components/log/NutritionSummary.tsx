import { macroProgress } from '@/lib/macros'
import { formatMacro, type Macros } from '@/types/food'

const macroFields = [
  { key: 'protein_g', label: 'Protein', color: 'bg-protein' },
  { key: 'carbs_g', label: 'Carbs', color: 'bg-carbs' },
  { key: 'fats_g', label: 'Fats', color: 'bg-fats' },
  { key: 'fiber_g', label: 'Fiber', color: 'bg-fiber' },
] as const

export function NutritionProgress({ current, goal, color = 'bg-primary' }: {
  current: number
  goal: number
  color?: string
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${color}`}
        style={{ width: `${macroProgress(current, goal)}%` }}
      />
    </div>
  )
}

export function MacroSummary({ values, goals, loading = false }: {
  values: Macros
  goals?: Macros
  loading?: boolean
}) {
  return (
    <dl className="grid grid-cols-4 gap-2 sm:gap-4">
      {macroFields.map(({ key, label, color }) => (
        <div key={key}>
          <dt className="text-xs font-medium text-muted">{label}</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground [overflow-wrap:anywhere] sm:text-base">
            {loading ? '…' : formatMacro(values[key])}
            {goals && (
              <>
                <span className="mb-1.5 block text-xs font-normal text-muted">of {formatMacro(goals[key])}</span>
                <NutritionProgress current={loading ? 0 : values[key]} goal={goals[key]} color={color} />
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
