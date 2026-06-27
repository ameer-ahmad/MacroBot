import { env } from '@/lib/env'
import type { FoodSearchResult } from '@/types/food'
import { roundMacro } from '@/types/food'

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1'

interface UsdaNutrient {
  nutrientId?: number
  nutrientNumber?: string
  value?: number
  amount?: number
}

interface UsdaFood {
  fdcId: number
  description: string
  brandOwner?: string
  brandName?: string
  servingSize?: number
  servingSizeUnit?: string
  foodNutrients?: UsdaNutrient[]
}

interface UsdaSearchResponse {
  foods?: UsdaFood[]
}

const NUTRIENT_MAP: Record<string, keyof Pick<FoodSearchResult, 'calories' | 'protein_g' | 'carbs_g' | 'fats_g' | 'fiber_g'>> = {
  '1008': 'calories',
  '208': 'calories',
  '1003': 'protein_g',
  '203': 'protein_g',
  '1005': 'carbs_g',
  '205': 'carbs_g',
  '1004': 'fats_g',
  '204': 'fats_g',
  '1079': 'fiber_g',
  '291': 'fiber_g',
}

function extractUsdaNutrients(nutrients: UsdaNutrient[] = []) {
  const macros = { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0 }

  for (const nutrient of nutrients) {
    const id = String(nutrient.nutrientId ?? nutrient.nutrientNumber ?? '')
    const field = NUTRIENT_MAP[id]
    if (!field) continue
    const amount = nutrient.value ?? nutrient.amount ?? 0
    macros[field] = roundMacro(amount)
  }

  return macros
}

function normalizeUsdaFood(food: UsdaFood): FoodSearchResult {
  const macros = extractUsdaNutrients(food.foodNutrients)
  const servingSize = food.servingSize && food.servingSize > 0 ? food.servingSize : 100
  const servingUnit = food.servingSizeUnit?.trim() || 'g'

  return {
    key: `usda:${food.fdcId}`,
    source: 'usda',
    externalId: String(food.fdcId),
    name: food.description,
    brand: food.brandOwner ?? food.brandName ?? null,
    servingSize,
    servingUnit,
    barcode: null,
    ...macros,
  }
}

function assertUsdaKey() {
  if (!env.usdaApiKey) {
    throw new Error('USDA API key not configured. Add VITE_USDA_API_KEY to your .env file.')
  }
  return env.usdaApiKey
}

export async function searchUsdaFoods(query: string): Promise<FoodSearchResult[]> {
  const apiKey = assertUsdaKey()
  const url = new URL(`${USDA_BASE}/foods/search`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('query', query)
  url.searchParams.set('pageSize', '20')
  for (const dataType of ['Foundation', 'SR Legacy', 'Branded']) {
    url.searchParams.append('dataType', dataType)
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`USDA search failed (${response.status})`)
  }

  const data = (await response.json()) as UsdaSearchResponse
  return (data.foods ?? []).map(normalizeUsdaFood)
}

export async function fetchUsdaFood(fdcId: string): Promise<FoodSearchResult> {
  const apiKey = assertUsdaKey()
  const url = `${USDA_BASE}/food/${fdcId}?api_key=${apiKey}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`USDA food lookup failed (${response.status})`)
  }

  const food = (await response.json()) as UsdaFood
  return normalizeUsdaFood(food)
}

export function isUsdaConfigured(): boolean {
  return Boolean(env.usdaApiKey)
}
