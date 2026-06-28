import { describe, expect, it } from 'vitest'
import { computeWeeklyAdjustment } from '@/lib/adjust'
import { lbToKg } from '@/lib/goals'
import { shiftDate } from '@/lib/macros'
import type { Profile, WeightEntry } from '@/types/database'

const TODAY = '2026-06-27'

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    name: 'Tester',
    units: 'imperial',
    calorie_goal: 2000,
    protein_goal: 150,
    carbs_goal: 200,
    fats_goal: 67,
    fiber_goal: 28,
    sex: 'male',
    age: 30,
    height_cm: 180,
    weight_kg: 81.6,
    activity_level: 'sedentary',
    diet_type: 'moderate',
    goal_direction: 'lose',
    intensity: 'moderate',
    last_adjustment_date: null,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

function weight(date: string, lb: number): WeightEntry {
  return {
    id: `w-${date}`,
    user_id: 'u1',
    logged_date: date,
    weight_kg: lbToKg(lb),
    created_at: `${date}T00:00:00Z`,
    updated_at: `${date}T00:00:00Z`,
  }
}

/** Two weeks of weights: prev week at `prevLb`, this week at `thisLb`. */
function twoWeeks(prevLb: number, thisLb: number): WeightEntry[] {
  return [
    weight(shiftDate(TODAY, -12), prevLb),
    weight(shiftDate(TODAY, -10), prevLb),
    weight(shiftDate(TODAY, -5), thisLb),
    weight(shiftDate(TODAY, -3), thisLb),
  ]
}

function calories(days: number, perDay: number): Map<string, number> {
  const map = new Map<string, number>()
  for (let i = 0; i < days; i++) map.set(shiftDate(TODAY, -i), perDay)
  return map
}

describe('computeWeeklyAdjustment', () => {
  it('is unavailable without a calculator goal', () => {
    const result = computeWeeklyAdjustment({
      profile: makeProfile({ goal_direction: null, intensity: null }),
      weights: twoWeeks(180, 179),
      caloriesByDate: calories(5, 2000),
      today: TODAY,
    })
    expect(result.status).toBe('unavailable')
  })

  it('is not due within a week of the last adjustment', () => {
    const result = computeWeeklyAdjustment({
      profile: makeProfile({ last_adjustment_date: shiftDate(TODAY, -3) }),
      weights: twoWeeks(180, 179),
      caloriesByDate: calories(5, 2000),
      today: TODAY,
    })
    expect(result.status).toBe('not_due')
  })

  it('needs two weeks of weight data', () => {
    const result = computeWeeklyAdjustment({
      profile: makeProfile(),
      weights: [weight(shiftDate(TODAY, -3), 179)],
      caloriesByDate: calories(5, 2000),
      today: TODAY,
    })
    expect(result.status).toBe('not_enough_data')
  })

  it('is on track when the trend matches the target pace', () => {
    // lose/moderate expects -1 lb/week; actual -1 lb.
    const result = computeWeeklyAdjustment({
      profile: makeProfile(),
      weights: twoWeeks(180, 179),
      caloriesByDate: calories(5, 2000),
      today: TODAY,
    })
    expect(result.status).toBe('on_track')
  })

  it('does not adjust when the user did not follow their calories', () => {
    // Losing too slowly, but they ate well under target -> not a fair signal.
    const result = computeWeeklyAdjustment({
      profile: makeProfile(),
      weights: twoWeeks(180, 179.6),
      caloriesByDate: calories(5, 1200),
      today: TODAY,
    })
    expect(result.status).toBe('not_followed')
  })

  it('requires at least four logged days', () => {
    const result = computeWeeklyAdjustment({
      profile: makeProfile(),
      weights: twoWeeks(180, 179.6),
      caloriesByDate: calories(3, 2000),
      today: TODAY,
    })
    expect(result.status).toBe('not_enough_logs')
  })

  it('suggests fewer calories when losing too slowly', () => {
    const result = computeWeeklyAdjustment({
      profile: makeProfile(),
      weights: twoWeeks(180, 179.6), // -0.4 lb vs -1 expected
      caloriesByDate: calories(5, 2000),
      today: TODAY,
    })
    expect(result.status).toBe('suggest')
    if (result.status === 'suggest') {
      expect(result.delta).toBeLessThan(0)
      expect(result.suggestedCalories).toBeLessThan(result.currentCalories)
      expect(result.goals.calorie_goal).toBe(result.suggestedCalories)
    }
  })
})
