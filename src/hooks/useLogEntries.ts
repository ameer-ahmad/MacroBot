import { useQuery } from '@tanstack/react-query'
import { fetchLogEntries, queryKeys, sumMacros } from '@/lib/api'
import { toDateString } from '@/lib/macros'

export function useLogEntries(date: string = toDateString()) {
  return useQuery({
    queryKey: queryKeys.logEntries(date),
    queryFn: () => fetchLogEntries(date),
  })
}

export function useDailyTotals(date: string = toDateString()) {
  const query = useLogEntries(date)
  const totals = query.data ? sumMacros(query.data) : null

  return {
    ...query,
    totals,
  }
}
