import { useQuery } from '@tanstack/react-query'
import { fetchLogEntriesInRange, queryKeys } from '@/lib/api'
import {
  buildTrendSeries,
  buildTrendSummary,
  getTrendDateRange,
  type TrendRange,
} from '@/lib/trends'

export function useTrendData(days: TrendRange) {
  const { start, end } = getTrendDateRange(days)

  const query = useQuery({
    queryKey: queryKeys.trends(start, end),
    queryFn: () => fetchLogEntriesInRange(start, end),
  })

  const series = query.data ? buildTrendSeries(query.data, days, end) : []
  const summary = buildTrendSummary(series, days)

  return {
    ...query,
    series,
    summary,
    start,
    end,
  }
}
