import { describe, expect, it } from 'vitest'
import {
  calcBMR,
  calcCalories,
  calcMaintenance,
  calorieAdjustment,
  expectedWeeklyChangeLb,
  kgToLb,
  lbToKg,
  macrosForCalories,
  type CalcInputs,
} from '@/lib/goals'

const base: CalcInputs = {
  sex: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 'sedentary',
  diet: 'moderate',
  goal: 'maintain',
  intensity: 'moderate',
}

describe('calcBMR (Mifflin–St Jeor)', () => {
  it('uses the +5 constant for men', () => {
    expect(calcBMR(base)).toBe(1780)
  })

  it('uses the -161 constant for women', () => {
    expect(calcBMR({ ...base, sex: 'female' })).toBe(1614)
  })
})

describe('calcMaintenance', () => {
  it('multiplies BMR by the activity factor', () => {
    expect(calcMaintenance(base)).toBe(Math.round(1780 * 1.2)) // 2136
  })

  it('uses a higher factor for very active', () => {
    expect(calcMaintenance({ ...base, activity: 'very' })).toBe(
      Math.round(1780 * 1.725),
    )
  })
})

describe('calorieAdjustment', () => {
  it('subtracts for losing weight', () => {
    expect(calorieAdjustment('lose', 'moderate')).toBe(-500)
    expect(calorieAdjustment('lose', 'slow')).toBe(-250)
    expect(calorieAdjustment('lose', 'fast')).toBe(-750)
  })

  it('adds for gaining weight', () => {
    expect(calorieAdjustment('gain', 'fast')).toBe(750)
  })

  it('is zero for maintenance', () => {
    expect(calorieAdjustment('maintain', 'fast')).toBe(0)
  })
})

describe('calcCalories', () => {
  it('applies the goal adjustment to maintenance', () => {
    expect(calcCalories({ ...base, goal: 'lose', intensity: 'moderate' })).toBe(
      2136 - 500,
    )
  })

  it('never drops below the 1200 floor', () => {
    expect(
      calcCalories({
        ...base,
        weightKg: 45,
        heightCm: 150,
        age: 60,
        goal: 'lose',
        intensity: 'fast',
      }),
    ).toBe(1200)
  })
})

describe('macrosForCalories', () => {
  it('splits 30/40/30 by calories into grams', () => {
    const m = macrosForCalories(2000, 'moderate')
    expect(m.protein_goal).toBe(150) // 2000*0.3/4
    expect(m.carbs_goal).toBe(200) // 2000*0.4/4
    expect(m.fats_goal).toBe(67) // 2000*0.3/9 rounded
    expect(m.fiber_goal).toBe(28) // 14g per 1000 kcal
  })

  it('shifts grams for low vs high carb', () => {
    const low = macrosForCalories(2000, 'low') // 40/20/40
    const high = macrosForCalories(2000, 'high') // 25/55/20
    expect(low.carbs_goal).toBeLessThan(high.carbs_goal)
    expect(low.fats_goal).toBeGreaterThan(high.fats_goal)
  })
})

describe('expectedWeeklyChangeLb', () => {
  it('returns negative pace for loss', () => {
    expect(expectedWeeklyChangeLb('lose', 'moderate')).toBe(-1)
    expect(expectedWeeklyChangeLb('lose', 'slow')).toBe(-0.5)
    expect(expectedWeeklyChangeLb('lose', 'fast')).toBe(-1.5)
  })

  it('returns positive pace for gain and zero for maintain', () => {
    expect(expectedWeeklyChangeLb('gain', 'slow')).toBe(0.5)
    expect(expectedWeeklyChangeLb('maintain', 'fast')).toBe(0)
  })
})

describe('weight conversions', () => {
  it('round-trips lb <-> kg', () => {
    expect(kgToLb(lbToKg(150))).toBeCloseTo(150, 6)
  })

  it('converts 1 kg to ~2.205 lb', () => {
    expect(kgToLb(1)).toBeCloseTo(2.20462, 5)
  })
})
