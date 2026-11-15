import { MacroSummary } from '@/components/log/NutritionSummary'
import { formatMacro, roundMacro, type Macros } from '@/types/food'

const presets = [
  { multiplier: 0.5, label: '½ serving', accessibleLabel: 'Half a serving' },
  { multiplier: 1, label: '1 serving', accessibleLabel: '1 serving' },
  { multiplier: 2, label: '2 servings', accessibleLabel: '2 servings' },
] as const

export function PortionField({ label, amount, onChange, servingSize = 1, minimum = '0.001', step = 'any', totals }: {
  label: string
  amount: string
  onChange: (amount: string) => void
  servingSize?: number
  minimum?: string
  step?: string
  totals: Macros
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-3">
      <label className="flex items-center justify-between gap-3 text-sm font-medium text-foreground">
        {label}
        <input
          type="number"
          inputMode="decimal"
          min={minimum}
          step={step}
          required
          value={amount}
          onChange={(event) => onChange(event.target.value)}
          className="w-24 rounded-lg border border-border bg-card px-2.5 py-2 text-base tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <div role="group" aria-label="Quick portions" className="grid grid-cols-3 gap-2">
        {presets.map(({ multiplier, label, accessibleLabel }) => {
          const presetAmount = roundMacro(servingSize * multiplier, 3)
          return (
            <button
              key={multiplier}
              type="button"
              aria-label={accessibleLabel}
              aria-pressed={Number(amount) === presetAmount}
              disabled={presetAmount < Number(minimum)}
              onClick={() => onChange(String(presetAmount))}
              className="min-h-11 cursor-pointer rounded-lg border border-border bg-card px-1 text-xs font-medium whitespace-nowrap text-muted hover:border-primary hover:text-primary aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-primary disabled:cursor-default disabled:opacity-50 sm:text-sm"
            >
              {label}
            </button>
          )
        })}
      </div>
      <div className="space-y-2 border-t border-border pt-2">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatMacro(totals.calories, 'kcal')}{' '}
          <span className="font-normal text-muted">for this portion</span>
        </p>
        <MacroSummary values={totals} />
      </div>
    </div>
  )
}
