import type { Food, FoodInsert } from '@/types/database'
import type { FoodSearchResult } from '@/types/food'
import { fetchFoods } from '@/lib/api'
import { searchOffFoods } from '@/lib/openFoodFacts'
import { isUsdaConfigured, searchUsdaFoods } from '@/lib/usda'

export function foodToSearchResult(food: Food): FoodSearchResult {
  return {
    key: `saved:${food.id}`,
    source: food.source,
    externalId: food.external_id ?? food.id,
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

export interface UnifiedSearchResult {
  saved: FoodSearchResult[]
  usda: FoodSearchResult[]
  openFoodFacts: FoodSearchResult[]
}

export async function searchFoods(query: string): Promise<UnifiedSearchResult> {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return { saved: [], usda: [], openFoodFacts: [] }
  }

  const lowerQuery = trimmed.toLowerCase()

  const [savedFoods, usdaResults, offResults] = await Promise.all([
    fetchFoods().then((foods) =>
      foods
        .filter(
          (food) =>
            food.name.toLowerCase().includes(lowerQuery) ||
            food.brand?.toLowerCase().includes(lowerQuery),
        )
        .slice(0, 10)
        .map(foodToSearchResult),
    ),
    isUsdaConfigured()
      ? searchUsdaFoods(trimmed).catch(() => [] as FoodSearchResult[])
      : Promise.resolve([] as FoodSearchResult[]),
    searchOffFoods(trimmed).catch(() => [] as FoodSearchResult[]),
  ])

  return {
    saved: savedFoods,
    usda: usdaResults,
    openFoodFacts: offResults,
  }
}

export function flattenSearchResults(results: UnifiedSearchResult): FoodSearchResult[] {
  const seen = new Set<string>()
  const merged: FoodSearchResult[] = []

  for (const group of [results.saved, results.usda, results.openFoodFacts]) {
    for (const item of group) {
      const dedupeKey = `${item.source}:${item.externalId}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      merged.push(item)
    }
  }

  return merged
}

export const SOURCE_LABELS: Record<FoodSearchResult['source'], string> = {
  manual: 'Manual',
  custom: 'Custom',
  usda: 'USDA',
  open_food_facts: 'Open Food Facts',
}
