import { useMemo } from 'react'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { fetchLogEntries, queryKeys, sumMacros } from '@/lib/api'
import { toDateString } from '@/lib/macros'
import { usePendingDisplayEntries } from '@/hooks/usePendingSync'
import type { DisplayLogEntry } from '@/lib/offlineQueue'

const LOG_QUERY_KEYS = new Set([
  'log-entries', 'daily-totals', 'recent-foods', 'loggable-search', 'trends', 'adjustment-logs',
])

export function invalidateFoodLog(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) => LOG_QUERY_KEYS.has(String(queryKey[0])),
  })
}

export function useLogEntries(date: string = toDateString()) {
  const query = useQuery({
    queryKey: queryKeys.logEntries(date),
    queryFn: () => fetchLogEntries(date),
    // The service worker can serve a previously loaded date even while offline.
    networkMode: 'always',
  })

  const pending = usePendingDisplayEntries(date)

  // Merge not-yet-synced entries so offline logs appear immediately.
  const data = useMemo<DisplayLogEntry[] | undefined>(() => {
    if (!query.data) return pending.length ? pending : query.data
    const savedIds = new Set(query.data.map((entry) => entry.id))
    return [...query.data, ...pending.filter((entry) => !savedIds.has(entry.id))]
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
