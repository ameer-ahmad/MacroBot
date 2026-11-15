import type { FoodSource } from './database.ts'

export type { Macros } from './database.ts'

/** Normalized food shape shared across USDA, Open Food Facts, and the saved library. */
export interface FoodSearchResult {
  /** Composite key for UI lists, e.g. usda:12345 or off:0123456789012 */
  key: string
  source: FoodSource
  externalId: string
  name: string
  brand: string | null
  servingSize: number
  servingUnit: string
  barcode: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
  /** True when this result comes from the user's previously logged foods. */
  recent?: boolean
  /** Links back to a saved foods row when known (for log_entries.food_id). */
  foodId?: string | null
}

/** Lightweight recipe card for search / add-food lists. */
export interface RecipeSearchResult {
  key: string
  id: string
  name: string
  servings: number
  ingredientCount: number
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
}

export function roundMacro(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function formatMacro(value: number, unit = 'g'): string {
  if (unit === 'kcal') return `${Math.round(value)} kcal`
  return `${roundMacro(value)}${unit}`
}
