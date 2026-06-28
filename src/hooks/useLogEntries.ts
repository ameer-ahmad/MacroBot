import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchLogEntries, queryKeys, sumMacros } from '@/lib/api'
import { toDateString } from '@/lib/macros'
import { usePendingDisplayEntries } from '@/hooks/usePendingSync'
import type { DisplayLogEntry } from '@/lib/offlineQueue'

export function useLogEntries(date: string = toDateString()) {
  const query = useQuery({
    queryKey: queryKeys.logEntries(date),
    queryFn: () => fetchLogEntries(date),
  })

  const pending = usePendingDisplayEntries(date)

  // Merge not-yet-synced entries so offline logs appear immediately.
  const data = useMemo<DisplayLogEntry[] | undefined>(() => {
    if (!query.data) return pending.length ? pending : query.data
    return [...query.data, ...pending]
  }, [query.data, pending])

  return { ...query, data }
}

export function useDailyTotals(date: string = toDateString()) {
  const query = useLogEntries(date)
  const totals = query.data ? sumMacros(query.data) : null

  return {
    ...query,
    totals,
  }
}
