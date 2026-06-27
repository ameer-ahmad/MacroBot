// Calorie (TDEE) and macro goal calculations.
//
// BMR uses the Mifflin–St Jeor equation, multiplied by an activity factor to
// get maintenance calories (TDEE). Macros are derived from a protein/carbs/fat
// percentage split, converted to grams (4 kcal/g protein & carbs, 9 kcal/g fat).

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra'
export type DietType = 'low' | 'moderate' | 'high'
export type GoalDirection = 'lose' | 'maintain' | 'gain'
export type Intensity = 'slow' | 'moderate' | 'fast'

export interface CalcInputs {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  diet: DietType
  goal: GoalDirection
  intensity: Intensity
}

export interface GoalSet {
  calorie_goal: number
  protein_goal: number
  carbs_goal: number
  fats_goal: number
  fiber_goal: number
}

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel
  factor: number
  label: string
  description: string
}[] = [
  {
    value: 'sedentary',
    factor: 1.2,
    label: 'Sedentary',
    description: 'Desk job with minimal or no exercise',
  },
  {
    value: 'light',
    factor: 1.375,
    label: 'Lightly active',
    description: 'Light exercise or walking 1–3 days a week',
  },
  {
    value: 'moderate',
    factor: 1.55,
    label: 'Moderately active',
    description: 'Moderate exercise or sports 3–5 days a week',
  },
  {
    value: 'very',
    factor: 1.725,
    label: 'Very active',
    description: 'Hard exercise or physical labor 6–7 days a week',
  },
  {
    value: 'extra',
    factor: 1.9,
    label: 'Extremely active',
    description: 'Very intense daily exercise and a physical job',
  },
]

export const DIET_OPTIONS: {
  value: DietType
  label: string
  /** protein / carbs / fats percentage split. */
  protein: number
  carbs: number
  fats: number
}[] = [
  { value: 'low', label: 'Low carb', protein: 40, carbs: 20, fats: 40 },
  { value: 'moderate', label: 'Moderate carb', protein: 30, carbs: 40, fats: 30 },
  { value: 'high', label: 'High carb', protein: 25, carbs: 55, fats: 20 },
]

export const GOAL_OPTIONS: {
  value: GoalDirection
  label: string
  /** Direction applied to the calorie adjustment. */
  sign: number
}[] = [
  { value: 'lose', label: 'Lose weight', sign: -1 },
  { value: 'maintain', label: 'Maintain', sign: 0 },
  { value: 'gain', label: 'Gain weight', sign: 1 },
]

export const INTENSITY_OPTIONS: {
  value: Intensity
  label: string
  /** Daily calorie delta from maintenance. */
  delta: number
}[] = [
  { value: 'slow', label: 'Slow', delta: 250 },
  { value: 'moderate', label: 'Moderate', delta: 500 },
  { value: 'fast', label: 'Fast', delta: 750 },
]

export function activityFactor(activity: ActivityLevel): number {
  return ACTIVITY_OPTIONS.find((o) => o.value === activity)?.factor ?? 1.2
}

export function dietSplit(diet: DietType) {
  return DIET_OPTIONS.find((o) => o.value === diet) ?? DIET_OPTIONS[1]
}

/** Signed daily calorie adjustment from the weight goal + intensity. */
export function calorieAdjustment(goal: GoalDirection, intensity: Intensity): number {
  const sign = GOAL_OPTIONS.find((o) => o.value === goal)?.sign ?? 0
  if (sign === 0) return 0
  const delta = INTENSITY_OPTIONS.find((o) => o.value === intensity)?.delta ?? 0
  return sign * delta
}

/** Mifflin–St Jeor basal metabolic rate (kcal/day). */
export function calcBMR(
  input: Pick<CalcInputs, 'sex' | 'weightKg' | 'heightCm' | 'age'>,
): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age
  return input.sex === 'female' ? base - 161 : base + 5
}

/** Maintenance calories = BMR × activity factor. */
export function calcMaintenance(input: CalcInputs): number {
  return Math.round(calcBMR(input) * activityFactor(input.activity))
}

/** Target calories = maintenance adjusted for the weight goal + intensity. */
export function calcCalories(input: CalcInputs): number {
  const target = calcMaintenance(input) + calorieAdjustment(input.goal, input.intensity)
  // Keep a sensible floor so aggressive cuts don't produce unsafe targets.
  return Math.max(1200, target)
}

/** Macro grams from a calorie target and diet split. */
export function macrosForCalories(
  calories: number,
  diet: DietType,
): Omit<GoalSet, 'calorie_goal'> {
  const split = dietSplit(diet)
  return {
    protein_goal: Math.round((calories * (split.protein / 100)) / 4),
    carbs_goal: Math.round((calories * (split.carbs / 100)) / 4),
    fats_goal: Math.round((calories * (split.fats / 100)) / 9),
    // Common guideline: ~14g fiber per 1000 kcal.
    fiber_goal: Math.round((calories / 1000) * 14),
  }
}

export function calcGoals(input: CalcInputs): GoalSet {
  const calorie_goal = calcCalories(input)
  return { calorie_goal, ...macrosForCalories(calorie_goal, input.diet) }
}

// ---------------------------------------------------------------------------
// Unit conversions
// ---------------------------------------------------------------------------

const LB_PER_KG = 2.20462
const IN_PER_CM = 0.393701

export const lbToKg = (lb: number) => lb / LB_PER_KG
export const kgToLb = (kg: number) => kg * LB_PER_KG
export const inToCm = (inches: number) => inches / IN_PER_CM
export const cmToIn = (cm: number) => cm * IN_PER_CM
