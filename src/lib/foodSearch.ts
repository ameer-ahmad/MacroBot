import type { Food, FoodInsert, LogEntry } from '@/types/database'
import type { FoodSearchResult } from '@/types/food'
import { roundMacro } from '@/types/food'
import { fetchFoods, fetchRecentLogEntries } from '@/lib/api'
import { macrosPerUnit } from '@/lib/macros'
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

/** Convert a previously logged entry into a per-serving food result. */
export function logEntryToRecentFood(entry: LogEntry): FoodSearchResult {
  const perServing = macrosPerUnit(entry)
  const identity = entry.food_id ?? entry.name.toLowerCase()

  return {
    key: `recent:${identity}`,
    source: 'manual',
    externalId: identity,
    foodId: entry.food_id,
    name: entry.name,
    brand: null,
    servingSize: 1,
    servingUnit: entry.serving_unit,
    barcode: null,
    recent: true,
    calories: roundMacro(perServing.calories, 0),
    protein_g: roundMacro(perServing.protein_g),
    carbs_g: roundMacro(perServing.carbs_g),
    fats_g: roundMacro(perServing.fats_g),
    fiber_g: roundMacro(perServing.fiber_g),
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

export interface LoggableSearchResult {
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
 * Search foods for logging. Returns previously logged items first (ordered by
 * recency), then the user's saved library (e.g. scanned nutrition labels), then
 * USDA database items not already shown. With an empty query, returns the most
 * recent logged foods plus the saved library for quick re-adding.
 */
export async function searchLoggableFoods(query: string): Promise<LoggableSearchResult> {
  const trimmed = query.trim()
  const lowerQuery = trimmed.toLowerCase()

  const [recentEntries, savedRaw] = await Promise.all([
    fetchRecentLogEntries().catch(() => [] as LogEntry[]),
    fetchFoods().catch(() => [] as Food[]),
  ])

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

  return { recent, saved, usda }
}

export const SOURCE_LABELS: Record<FoodSearchResult['source'], string> = {
  manual: 'Manual',
  custom: 'Custom',
  usda: 'USDA',
  open_food_facts: 'Open Food Facts',
}
