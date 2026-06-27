import type { FoodSearchResult } from '@/types/food'
import { roundMacro } from '@/types/food'

interface OffProduct {
  code?: string
  product_name?: string
  brands?: string
  serving_size?: string
  serving_quantity?: number | string
  quantity?: string
  nutriments?: Record<string, number | undefined>
}

interface OffProductResponse {
  status: number
  product?: OffProduct
}

interface OffSearchResponse {
  products?: OffProduct[]
}

function parseServing(product: OffProduct): { size: number; unit: string } {
  const quantity = Number(product.serving_quantity)
  if (Number.isFinite(quantity) && quantity > 0) {
    return { size: quantity, unit: 'g' }
  }

  const servingSize = product.serving_size?.trim()
  if (servingSize) {
    const match = servingSize.match(/^([\d.]+)\s*(.*)$/)
    if (match) {
      return {
        size: Number(match[1]) || 100,
        unit: match[2]?.trim() || 'serving',
      }
    }
  }

  return { size: 100, unit: 'g' }
}

function readNutrient(
  nutriments: Record<string, number | undefined>,
  base: string,
  per: 'serving' | '100g',
): number {
  const suffix = per === 'serving' ? '_serving' : '_100g'
  return nutriments[`${base}${suffix}`] ?? nutriments[base] ?? 0
}

function normalizeOffProduct(product: OffProduct): FoodSearchResult | null {
  const name = product.product_name?.trim()
  if (!name) return null

  const nutriments = product.nutriments ?? {}
  const serving = parseServing(product)
  const hasServingData =
    readNutrient(nutriments, 'energy-kcal', 'serving') > 0 ||
    readNutrient(nutriments, 'proteins', 'serving') > 0

  const scale = serving.size / 100

  const calories = hasServingData
    ? readNutrient(nutriments, 'energy-kcal', 'serving')
    : readNutrient(nutriments, 'energy-kcal', '100g') * scale

  const protein_g = hasServingData
    ? readNutrient(nutriments, 'proteins', 'serving')
    : readNutrient(nutriments, 'proteins', '100g') * scale

  const carbs_g = hasServingData
    ? readNutrient(nutriments, 'carbohydrates', 'serving')
    : readNutrient(nutriments, 'carbohydrates', '100g') * scale

  const fats_g = hasServingData
    ? readNutrient(nutriments, 'fat', 'serving')
    : readNutrient(nutriments, 'fat', '100g') * scale

  const fiber_g = hasServingData
    ? readNutrient(nutriments, 'fiber', 'serving')
    : readNutrient(nutriments, 'fiber', '100g') * scale

  const barcode = product.code ?? null

  return {
    key: `off:${barcode ?? name}`,
    source: 'open_food_facts',
    externalId: barcode ?? name,
    name,
    brand: product.brands?.split(',')[0]?.trim() ?? null,
    servingSize: serving.size,
    servingUnit: serving.unit,
    barcode,
    calories: roundMacro(calories, 0),
    protein_g: roundMacro(protein_g),
    carbs_g: roundMacro(carbs_g),
    fats_g: roundMacro(fats_g),
    fiber_g: roundMacro(fiber_g),
  }
}

export async function lookupOffBarcode(barcode: string): Promise<FoodSearchResult | null> {
  const cleaned = barcode.replace(/\D/g, '')
  if (!cleaned) return null

  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${cleaned}.json`,
    { headers: { 'User-Agent': 'MacroBot/1.0' } },
  )

  if (!response.ok) {
    throw new Error(`Open Food Facts lookup failed (${response.status})`)
  }

  const data = (await response.json()) as OffProductResponse
  if (data.status !== 1 || !data.product) return null

  return normalizeOffProduct(data.product)
}

export async function searchOffFoods(query: string): Promise<FoodSearchResult[]> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '10')

  const response = await fetch(url, {
    headers: { 'User-Agent': 'MacroBot/1.0' },
  })

  if (!response.ok) {
    throw new Error(`Open Food Facts search failed (${response.status})`)
  }

  const data = (await response.json()) as OffSearchResponse
  return (data.products ?? [])
    .map(normalizeOffProduct)
    .filter((item): item is FoodSearchResult => item !== null)
}
