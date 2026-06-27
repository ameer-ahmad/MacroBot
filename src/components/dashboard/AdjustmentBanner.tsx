import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, Sparkles } from 'lucide-react'
import { queryKeys, updateProfile } from '@/lib/api'
import { toDateString } from '@/lib/macros'
import type { AdjustmentResult } from '@/lib/adjust'
import type { Profile } from '@/types/database'

function formatChange(lb: number, imperial: boolean): string {
  const value = imperial ? lb : lb * 0.453592
  const rounded = Math.round(Math.abs(value) * 10) / 10
  const sign = lb > 0 ? '+' : lb < 0 ? '−' : ''
  return `${sign}${rounded} ${imperial ? 'lb' : 'kg'}`
}

export function AdjustmentBanner({
  result,
  profile,
  simulate = false,
  onResolved,
}: {
  result: AdjustmentResult
  profile: Profile
  /** When true, accept/deny do NOT write to the database (dev simulation only). */
  simulate?: boolean
  /** Called after the user resolves the banner (apply/keep/got it). */
  onResolved?: (action: 'applied' | 'kept') => void
}) {
  const queryClient = useQueryClient()
  const imperial = profile.units === 'imperial'

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    queryClient.invalidateQueries({ queryKey: queryKeys.dailyTotals(toDateString()) })
  }

  const acceptMutation = useMutation({
    mutationFn: (updates: Parameters<typeof updateProfile>[0]) => updateProfile(updates),
    onSuccess: invalidate,
  })

  function resolve(
    updates: Parameters<typeof updateProfile>[0],
    action: 'applied' | 'kept',
  ) {
    if (simulate) {
      onResolved?.(action)
      return
    }
    acceptMutation.mutate(updates, { onSuccess: () => onResolved?.(action) })
  }

  if (result.status === 'not_followed') {
    return (
      <section className="rounded-2xl border border-carbs/30 bg-carbs/10 p-4 shadow-sm">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-carbs" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Weekly check: no change suggested
            </p>
            <p className="mt-1 text-xs text-muted">
              Your weight trend is off target ({formatChange(result.weeklyChangeLb, imperial)}/wk
              vs {formatChange(result.expectedChangeLb, imperial)}/wk), but your logged intake
              averaged {result.avgCalories.toLocaleString()} kcal vs a{' '}
              {result.calorieGoal.toLocaleString()} kcal goal — so we'll keep your targets until
              the plan is followed more closely.
            </p>
            <button
              type="button"
              onClick={() => resolve({ last_adjustment_date: toDateString() }, 'kept')}
              disabled={acceptMutation.isPending}
              className="mt-3 cursor-pointer rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              Got it
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (result.status !== 'suggest') return null

  const goingUp = result.delta > 0

  return (
    <section className="rounded-2xl border border-primary/30 bg-accent/40 p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            Time to adjust your calories?
          </p>
          <p className="mt-1 text-xs text-muted">
            Over the last week your weight changed{' '}
            {formatChange(result.weeklyChangeLb, imperial)} vs a target of{' '}
            {formatChange(result.expectedChangeLb, imperial)}. Based on your trend we suggest{' '}
            {goingUp ? 'increasing' : 'lowering'} your daily target.
          </p>

          <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
            <span className="text-muted line-through">
              {result.currentCalories.toLocaleString()}
            </span>
            <span className="font-semibold text-foreground">
              {result.suggestedCalories.toLocaleString()} kcal
            </span>
            <span
              className={`text-xs font-medium ${goingUp ? 'text-carbs' : 'text-primary'}`}
            >
              {goingUp ? '+' : ''}
              {result.delta} kcal
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            New macros: P {result.goals.protein_goal}g · C {result.goals.carbs_goal}g · F{' '}
            {result.goals.fats_goal}g · Fiber {result.goals.fiber_goal}g
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() =>
                resolve(
                  { ...result.goals, last_adjustment_date: toDateString() },
                  'applied',
                )
              }
              disabled={acceptMutation.isPending}
              className="flex-1 cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {acceptMutation.isPending ? 'Applying…' : 'Apply new goals'}
            </button>
            <button
              type="button"
              onClick={() => resolve({ last_adjustment_date: toDateString() }, 'kept')}
              disabled={acceptMutation.isPending}
              className="cursor-pointer rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              Keep current
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
