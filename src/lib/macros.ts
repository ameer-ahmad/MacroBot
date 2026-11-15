import type { Food, LogEntry } from '@/types/database'
import type { FoodSearchResult, Macros } from '@/types/food'
import { roundMacro } from '@/types/food'

export function toDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateString(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`)
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseDateString(dateStr)
  const today = toDateString()
  const yesterday = toDateString(new Date(Date.now() - 86_400_000))

  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function shiftDate(dateStr: string, days: number): string {
  const date = parseDateString(dateStr)
  date.setDate(date.getDate() + days)
  return toDateString(date)
}

/** Units that are measured by weight/volume and can be scaled by an exact amount. */
const WEIGHT_UNITS = new Set([
  'g',
  'gram',
  'grams',
  'mg',
  'kg',
  'ml',
  'milliliter',
  'milliliters',
  'millilitre',
  'millilitres',
  'l',
  'oz',
])

/** Units treated as generic servings (not a measurable weight or specific count). */
const GENERIC_SERVING_UNITS = new Set([
  '',
  'serving',
  'servings',
  'portion',
  'portions',
])

/** True when a serving unit can be logged by an exact amount (e.g. grams). */
export function isWeightUnit(unit: string | null | undefined): boolean {
  if (!unit) return false
  return WEIGHT_UNITS.has(unit.trim().toLowerCase())
}

/** True when the unit is a plain serving/portion with no meaningful amount. */
export function isGenericServingUnit(unit: string | null | undefined): boolean {
  return GENERIC_SERVING_UNITS.has((unit ?? '').trim().toLowerCase())
}

/** Label + input constraints for an amount/quantity field based on the unit. */
export function amountFieldConfig(unit: string | null | undefined): {
  label: string
  min: string
  step: string
} {
  if (isWeightUnit(unit)) {
    return { label: `Amount (${unit})`, min: '0', step: 'any' }
  }
  if (isGenericServingUnit(unit)) {
    return { label: 'Quantity (servings)', min: '0.25', step: '0.25' }
  }
  return { label: `Quantity (${unit})`, min: '0', step: 'any' }
}

/**
 * Macros for a given amount of a food. `amount` is interpreted in the food's
 * serving unit (e.g. grams, eggs, or servings) and macros scale by
 * `amount / servingSize`, where servingSize is the basis the macros describe.
 */
export function macrosForAmount(
  food: Pick<FoodSearchResult, keyof Macros | 'servingSize' | 'servingUnit'>,
  amount: number,
): Macros {
  const base: Macros = {
    calories: Number(food.calories),
    protein_g: Number(food.protein_g),
    carbs_g: Number(food.carbs_g),
    fats_g: Number(food.fats_g),
    fiber_g: Number(food.fiber_g),
  }
  const factor = amount / (Number(food.servingSize) || 1)
  return scaleMacros(base, factor)
}

export function scaleMacros(macros: Macros, quantity: number): Macros {
  return {
    calories: roundMacro(macros.calories * quantity, 0),
    protein_g: roundMacro(macros.protein_g * quantity),
    carbs_g: roundMacro(macros.carbs_g * quantity),
    fats_g: roundMacro(macros.fats_g * quantity),
    fiber_g: roundMacro(macros.fiber_g * quantity),
  }
}

export function macrosPerUnit(entry: Pick<LogEntry, keyof Macros | 'quantity'>): Macros {
  const qty = Number(entry.quantity) || 1
  return {
    calories: Number(entry.calories) / qty,
    protein_g: Number(entry.protein_g) / qty,
    carbs_g: Number(entry.carbs_g) / qty,
    fats_g: Number(entry.fats_g) / qty,
    fiber_g: Number(entry.fiber_g) / qty,
  }
}

export function macrosFromFoodSource(
  food: Food | FoodSearchResult,
  quantity: number,
): Macros {
  return scaleMacros(
    {
      calories: Number(food.calories),
      protein_g: Number(food.protein_g),
      carbs_g: Number(food.carbs_g),
      fats_g: Number(food.fats_g),
      fiber_g: Number(food.fiber_g),
    },
    quantity,
  )
}

export function macroProgress(current: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, (current / goal) * 100)
}

export function macroRemaining(current: number, goal: number): number {
  return Math.max(0, goal - current)
}

export function calorieBalanceLabel(calories: number, goal: number): string {
  const balance = Math.round(calories) - Math.round(goal)
  if (balance === 0) return 'At calorie goal'
  const amount = Math.abs(balance).toLocaleString()
  return balance > 0 ? `${amount} kcal over goal` : `${amount} kcal remaining`
}
