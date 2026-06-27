import type { Profile, WeightEntry } from '@/types/database'
import {
  expectedWeeklyChangeLb,
  kgToLb,
  macrosForCalories,
  type GoalSet,
} from '@/lib/goals'
import { shiftDate, toDateString } from '@/lib/macros'

const TOLERANCE_LB = 0.25
// 1 lb of body weight ≈ 3500 kcal, spread across a week.
const CAL_PER_LB_DAILY = 3500 / 7
const MAX_DAILY_DELTA = 400
const MIN_DAILY_DELTA = 25
const MIN_LOGGED_DAYS = 4
const MIN_WEIGHTS_PER_WEEK = 2
const CALORIE_FLOOR = 1200

export type AdjustmentResult =
  | { status: 'unavailable' }
  | { status: 'not_due' }
  | { status: 'not_enough_data' }
  | { status: 'not_enough_logs' }
  | { status: 'on_track'; weeklyChangeLb: number; expectedChangeLb: number }
  | {
      status: 'not_followed'
      avgCalories: number
      calorieGoal: number
      weeklyChangeLb: number
      expectedChangeLb: number
    }
  | {
      status: 'suggest'
      currentCalories: number
      suggestedCalories: number
      delta: number
      goals: GoalSet
      weeklyChangeLb: number
      expectedChangeLb: number
      avgCalories: number
    }

function averageWeight(
  weights: WeightEntry[],
  startDate: string,
  endDate: string,
): { avg: number; count: number } {
  const inRange = weights.filter(
    (w) => w.logged_date >= startDate && w.logged_date <= endDate,
  )
  if (inRange.length === 0) return { avg: 0, count: 0 }
  const sum = inRange.reduce((t, w) => t + Number(w.weight_kg), 0)
  return { avg: sum / inRange.length, count: inRange.length }
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Compare the last 7 days of weight to the prior 7 days and, when the trend is
 * off the user's target pace (and they actually ate near their target), suggest
 * a calorie adjustment. Runs at most once per week.
 */
export function computeWeeklyAdjustment(args: {
  profile: Profile
  weights: WeightEntry[]
  caloriesByDate: Map<string, number>
  today?: string
}): AdjustmentResult {
  const { profile, weights } = args
  const today = args.today ?? toDateString()

  // Needs a calculator-based goal to know the target pace + macro split.
  if (!profile.goal_direction || !profile.intensity) {
    return { status: 'unavailable' }
  }

  // Only check once per week.
  if (profile.last_adjustment_date && today < shiftDate(profile.last_adjustment_date, 7)) {
    return { status: 'not_due' }
  }

  const thisWeekStart = shiftDate(today, -6)
  const prevWeekEnd = shiftDate(today, -7)
  const prevWeekStart = shiftDate(today, -13)

  const thisWeek = averageWeight(weights, thisWeekStart, today)
  const prevWeek = averageWeight(weights, prevWeekStart, prevWeekEnd)

  // Require two weeks of weight data with enough points to be meaningful.
  if (
    thisWeek.count < MIN_WEIGHTS_PER_WEEK ||
    prevWeek.count < MIN_WEIGHTS_PER_WEEK
  ) {
    return { status: 'not_enough_data' }
  }

  const weeklyChangeLb = round(kgToLb(thisWeek.avg - prevWeek.avg), 2)
  const expectedChangeLb = expectedWeeklyChangeLb(
    profile.goal_direction,
    profile.intensity,
  )
  const errorLb = weeklyChangeLb - expectedChangeLb

  // On track: no change needed.
  if (Math.abs(errorLb) <= TOLERANCE_LB) {
    return { status: 'on_track', weeklyChangeLb, expectedChangeLb }
  }

  // Check adherence: did they log enough days and eat near their target?
  let loggedDays = 0
  let calorieSum = 0
  for (let i = 0; i < 7; i++) {
    const date = shiftDate(today, -i)
    const value = args.caloriesByDate.get(date) ?? 0
    if (value > 0) {
      loggedDays += 1
      calorieSum += value
    }
  }

  if (loggedDays < MIN_LOGGED_DAYS) {
    return { status: 'not_enough_logs' }
  }

  const avgCalories = Math.round(calorieSum / loggedDays)
  const calorieGoal = profile.calorie_goal
  const adherenceTolerance = Math.max(150, calorieGoal * 0.1)

  // If they didn't follow the plan, the trend isn't a fair signal — don't adjust.
  if (Math.abs(avgCalories - calorieGoal) > adherenceTolerance) {
    return {
      status: 'not_followed',
      avgCalories,
      calorieGoal,
      weeklyChangeLb,
      expectedChangeLb,
    }
  }

  // Map the weekly discrepancy to a daily calorie change.
  let dailyDelta = Math.round((-errorLb * CAL_PER_LB_DAILY) / 25) * 25
  dailyDelta = Math.max(-MAX_DAILY_DELTA, Math.min(MAX_DAILY_DELTA, dailyDelta))

  if (Math.abs(dailyDelta) < MIN_DAILY_DELTA) {
    return { status: 'on_track', weeklyChangeLb, expectedChangeLb }
  }

  const suggestedCalories = Math.max(CALORIE_FLOOR, calorieGoal + dailyDelta)
  const realDelta = suggestedCalories - calorieGoal

  if (realDelta === 0) {
    return { status: 'on_track', weeklyChangeLb, expectedChangeLb }
  }

  // Re-derive macros from the diet split when known, else scale current macros.
  let goals: GoalSet
  if (profile.diet_type) {
    goals = {
      calorie_goal: suggestedCalories,
      ...macrosForCalories(suggestedCalories, profile.diet_type),
    }
  } else {
    const ratio = suggestedCalories / calorieGoal
    goals = {
      calorie_goal: suggestedCalories,
      protein_goal: Math.round(profile.protein_goal * ratio),
      carbs_goal: Math.round(profile.carbs_goal * ratio),
      fats_goal: Math.round(profile.fats_goal * ratio),
      fiber_goal: Math.round(profile.fiber_goal * ratio),
    }
  }

  return {
    status: 'suggest',
    currentCalories: calorieGoal,
    suggestedCalories,
    delta: realDelta,
    goals,
    weeklyChangeLb,
    expectedChangeLb,
    avgCalories,
  }
}
