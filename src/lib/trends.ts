import { sumMacros } from '@/lib/api'
import { parseDateString, shiftDate, toDateString } from '@/lib/macros'
import type { LogEntry } from '@/types/database'
import type { Macros } from '@/types/food'

export type TrendRange = 7 | 30

export interface DailyTrendPoint extends Macros {
  date: string
  label: string
}

export interface TrendSummary {
  avgCalories: number
  avgProtein: number
  daysLogged: number
  totalDays: number
}

export const CHART_COLORS = {
  calories: '#059669',
  protein: '#3b82f6',
  carbs: '#f59e0b',
  fats: '#ef4444',
  fiber: '#8b5cf6',
} as const

export function getTrendDateRange(days: TrendRange): { start: string; end: string } {
  const end = toDateString()
  const start = shiftDate(end, -(days - 1))
  return { start, end }
}

function formatChartLabel(dateStr: string, days: TrendRange): string {
  const date = parseDateString(dateStr)
  if (days === 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function buildTrendSeries(
  entries: LogEntry[],
  days: TrendRange,
): DailyTrendPoint[] {
  const end = toDateString()
  const points: DailyTrendPoint[] = []

  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDate(end, -i)
    const dayEntries = entries.filter((e) => e.logged_date === date)
    const totals = sumMacros(dayEntries)

    points.push({
      date,
      label: formatChartLabel(date, days),
      ...totals,
    })
  }

  return points
}

export function buildTrendSummary(
  series: DailyTrendPoint[],
  days: TrendRange,
): TrendSummary {
  const daysLogged = series.filter((d) => d.calories > 0).length
  const totalCalories = series.reduce((sum, d) => sum + d.calories, 0)
  const totalProtein = series.reduce((sum, d) => sum + d.protein_g, 0)

  return {
    avgCalories: daysLogged > 0 ? Math.round(totalCalories / daysLogged) : 0,
    avgProtein: daysLogged > 0 ? Math.round((totalProtein / daysLogged) * 10) / 10 : 0,
    daysLogged,
    totalDays: days,
  }
}
