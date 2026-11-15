import { describe, expect, it } from 'vitest'
import { buildTrendSeries, buildTrendSummary } from '@/lib/trends'
import type { LogEntry } from '@/types/database'

function entry(date: string, calories: number, protein: number): LogEntry {
  return {
    id: date,
    user_id: 'user',
    logged_date: date,
    meal: 'lunch',
    food_id: null,
    name: 'Lunch',
    quantity: 1,
    serving_unit: 'serving',
    calories,
    protein_g: protein,
    carbs_g: 0,
    fats_g: 0,
    fiber_g: 0,
    notes: null,
    created_at: `${date}T12:00:00Z`,
    updated_at: `${date}T12:00:00Z`,
  }
}

describe('food trends', () => {
  it('leaves an unlogged day blank and counts a logged zero toward the averages', () => {
    const series = buildTrendSeries([entry('2026-11-12', 500, 20), entry('2026-11-14', 0, 0)], 7, '2026-11-14')
    expect(series.slice(-3).map(({ calories, protein_g }) => [calories, protein_g])).toEqual([
      [500, 20], [null, null], [0, 0],
    ])
    expect(buildTrendSummary(series, 7)).toEqual({
      avgCalories: 250, avgProtein: 10, daysLogged: 2, totalDays: 7,
    })
  })
})
