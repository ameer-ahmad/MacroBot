import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { fetchWeightEntries, queryKeys, upsertWeightEntry } from '@/lib/api'
import { useProfile } from '@/hooks/useProfile'
import { kgToLb, lbToKg } from '@/lib/goals'
import { shiftDate, toDateString } from '@/lib/macros'

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function WeightCard() {
  const queryClient = useQueryClient()
  const { data: profile } = useProfile()
  const imperial = profile?.units === 'imperial'
  const unitLabel = imperial ? 'lb' : 'kg'
  const today = toDateString()

  const { data: weights = [] } = useQuery({
    queryKey: queryKeys.weightEntries,
    queryFn: () => fetchWeightEntries(),
    enabled: Boolean(profile),
  })

  const todayEntry = weights.find((w) => w.logged_date === today)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (todayEntry) {
      setValue(String(round(imperial ? kgToLb(todayEntry.weight_kg) : todayEntry.weight_kg)))
    }
  }, [todayEntry, imperial])

  const mutation = useMutation({
    mutationFn: () => {
      const num = Number(value)
      if (!num || num <= 0) throw new Error('Enter a valid weight')
      return upsertWeightEntry({
        logged_date: today,
        weight_kg: round(imperial ? lbToKg(num) : num, 2),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weightEntries })
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save'),
  })

  // 7-day trend: latest entry vs the most recent entry on/before a week ago.
  const latest = weights[0]
  const refDate = shiftDate(today, -7)
  const ref = weights.find((w) => w.logged_date <= refDate)
  const deltaKg = latest && ref ? latest.weight_kg - ref.weight_kg : null
  const deltaDisplay =
    deltaKg !== null ? round(imperial ? kgToLb(deltaKg) : deltaKg) : null

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-muted">Today's weight</p>
        </div>
        {deltaDisplay !== null && deltaDisplay !== 0 && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${
              deltaDisplay < 0 ? 'text-primary' : 'text-carbs'
            }`}
          >
            {deltaDisplay < 0 ? (
              <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {deltaDisplay > 0 ? '+' : ''}
            {deltaDisplay} {unitLabel} / wk
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min="0"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Weight in ${unitLabel}`}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            {unitLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {todayEntry ? 'Update' : 'Log'}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-fats">{error}</p>}
      {todayEntry && !error && (
        <p className="mt-2 text-xs text-muted">Logged for today. Tap update to change it.</p>
      )}
    </section>
  )
}
