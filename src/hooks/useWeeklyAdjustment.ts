import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchLogEntriesInRange, fetchWeightEntries, queryKeys } from '@/lib/api'
import { computeWeeklyAdjustment, type AdjustmentResult } from '@/lib/adjust'
import { useProfile } from '@/hooks/useProfile'
import { shiftDate, toDateString } from '@/lib/macros'

export function useWeeklyAdjustment(): AdjustmentResult | null {
  const { data: profile } = useProfile()
  const today = toDateString()
  const rangeStart = shiftDate(today, -13)

  const { data: weights } = useQuery({
    queryKey: queryKeys.weightEntries,
    queryFn: () => fetchWeightEntries(),
    enabled: Boolean(profile),
  })

  const { data: logs } = useQuery({
    queryKey: ['adjustment-logs', rangeStart, today],
    queryFn: () => fetchLogEntriesInRange(rangeStart, today),
    enabled: Boolean(profile),
  })

  return useMemo(() => {
    if (!profile || !weights || !logs) return null
    const caloriesByDate = new Map<string, number>()
    for (const entry of logs) {
      caloriesByDate.set(
        entry.logged_date,
        (caloriesByDate.get(entry.logged_date) ?? 0) + Number(entry.calories),
      )
    }
    return computeWeeklyAdjustment({ profile, weights, caloriesByDate, today })
  }, [profile, weights, logs, today])
}
