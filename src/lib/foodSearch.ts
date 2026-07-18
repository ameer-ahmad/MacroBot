import type { Food, FoodInsert, LogEntry, RecipeWithIngredients } from '@/types/database'
import type { FoodSearchResult, RecipeSearchResult } from '@/types/food'
import { roundMacro } from '@/types/food'
import {
  fetchFoods,
  fetchRecentLogEntries,
  fetchRecipesWithIngredients,
  sumMacros,
} from '@/lib/api'
import { isUsdaConfigured, searchUsdaFoods } from '@/lib/usda'

export function foodToSearchResult(food: Food): FoodSearchResult {
  return {
    key: `saved:${food.id}`,
    source: food.source,
    externalId: food.external_id ?? food.id,
    foodId: food.id,
    name: food.name,
    brand: food.brand,
    servingSize: Number(food.serving_size),
    servingUnit: food.serving_unit,
    barcode: food.barcode,
    calories: Number(food.calories),
    protein_g: Number(food.protein_g),
    carbs_g: Number(food.carbs_g),
    fats_g: Number(food.fats_g),
    fiber_g: Number(food.fiber_g),
  }
}

export function searchResultToFoodInsert(result: FoodSearchResult): Omit<FoodInsert, 'user_id'> {
  return {
    name: result.name,
    brand: result.brand,
    serving_size: result.servingSize,
    serving_unit: result.servingUnit,
    calories: result.calories,
    protein_g: result.protein_g,
    carbs_g: result.carbs_g,
    fats_g: result.fats_g,
    fiber_g: result.fiber_g,
    barcode: result.barcode,
    source: result.source,
    external_id: result.externalId,
  }
}

/** Convert a previously logged entry into a food result for re-adding. */
export function logEntryToRecentFood(entry: LogEntry): FoodSearchResult {
  const identity = entry.food_id ?? entry.name.toLowerCase()

  // Keep the last logged amount as the basis (servingSize) with its totals, so
  // re-adding defaults to that amount and still scales to any new amount.
  const servingSize = Number(entry.quantity) || 1

  return {
    key: `recent:${identity}`,
    source: 'manual',
    externalId: identity,
    foodId: entry.food_id,
    name: entry.name,
    brand: null,
    servingSize,
    servingUnit: entry.serving_unit,
    barcode: null,
    recent: true,
    calories: roundMacro(Number(entry.calories), 0),
    protein_g: roundMacro(Number(entry.protein_g)),
    carbs_g: roundMacro(Number(entry.carbs_g)),
    fats_g: roundMacro(Number(entry.fats_g)),
    fiber_g: roundMacro(Number(entry.fiber_g)),
  }
}

/** Dedupe recent entries by food identity, keeping the most recently logged. */
export function dedupeRecentFoods(entries: LogEntry[]): FoodSearchResult[] {
  const seen = new Set<string>()
  const result: FoodSearchResult[] = []

  for (const entry of entries) {
    const identity = entry.food_id ?? entry.name.toLowerCase()
    if (seen.has(identity)) continue
    seen.add(identity)
    result.push(logEntryToRecentFood(entry))
  }

  return result
}

export function recipeToSearchResult(recipe: RecipeWithIngredients): RecipeSearchResult {
  const totals = sumMacros(recipe.ingredients)
  return {
    key: `recipe:${recipe.id}`,
    id: recipe.id,
    name: recipe.name,
    servings: Number(recipe.servings) || 1,
    ingredientCount: recipe.ingredients.length,
    calories: roundMacro(totals.calories, 0),
    protein_g: roundMacro(totals.protein_g),
    carbs_g: roundMacro(totals.carbs_g),
    fats_g: roundMacro(totals.fats_g),
    fiber_g: roundMacro(totals.fiber_g),
  }
}

export interface LoggableSearchResult {
  recipes: RecipeSearchResult[]
  recent: FoodSearchResult[]
  saved: FoodSearchResult[]
  usda: FoodSearchResult[]
}

/** Identity used to avoid showing the same food in multiple sections. */
function foodIdentity(food: FoodSearchResult): string {
  return food.foodId ?? food.name.toLowerCase()
}

function matchesQuery(food: FoodSearchResult, lowerQuery: string): boolean {
  if (!lowerQuery) return true
  return (
    food.name.toLowerCase().includes(lowerQuery) ||
    Boolean(food.brand?.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Search foods for logging. Returns recipes, previously logged items (by
 * recency), the user's saved library, then USDA items not already shown.
 */
export async function searchLoggableFoods(query: string): Promise<LoggableSearchResult> {
  const trimmed = query.trim()
  const lowerQuery = trimmed.toLowerCase()

  const [recentEntries, savedRaw, recipeRaw] = await Promise.all([
    fetchRecentLogEntries().catch(() => [] as LogEntry[]),
    fetchFoods().catch(() => [] as Food[]),
    fetchRecipesWithIngredients().catch(() => [] as RecipeWithIngredients[]),
  ])

  const recipeResults = recipeRaw
    .map(recipeToSearchResult)
    .filter((r) => !lowerQuery || r.name.toLowerCase().includes(lowerQuery))
  const recipes = trimmed.length === 0 ? recipeResults.slice(0, 15) : recipeResults

  const recentFoods = dedupeRecentFoods(recentEntries)
  const recent = (
    trimmed.length === 0 ? recentFoods.slice(0, 15) : recentFoods.filter((f) => matchesQuery(f, lowerQuery))
  )

  // Saved library foods that aren't already represented in the recent section.
  const recentIdentities = new Set(recent.map(foodIdentity))
  const savedFoods = savedRaw
    .map(foodToSearchResult)
    .filter((food) => matchesQuery(food, lowerQuery) && !recentIdentities.has(foodIdentity(food)))
  const saved = trimmed.length === 0 ? savedFoods.slice(0, 15) : savedFoods

  let usda: FoodSearchResult[] = []
  if (trimmed.length >= 2 && isUsdaConfigured()) {
    const shownNames = new Set(
      [...recent, ...saved].map((food) => food.name.toLowerCase()),
    )
    const usdaResults = await searchUsdaFoods(trimmed).catch(() => [] as FoodSearchResult[])
    usda = usdaResults.filter((food) => !shownNames.has(food.name.toLowerCase()))
  }

  return { recipes, recent, saved, usda }
}

export const SOURCE_LABELS: Record<FoodSearchResult['source'], string> = {
  manual: 'Manual',
  custom: 'Custom',
  usda: 'USDA',
  open_food_facts: 'Open Food Facts',
}
