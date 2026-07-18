import { describe, expect, it } from 'vitest'
import { scaleRecipeForLog, sumMacros } from '@/lib/api'
import type { RecipeWithIngredients } from '@/types/database'

function makeRecipe(
  overrides: Partial<RecipeWithIngredients> = {},
): RecipeWithIngredients {
  return {
    id: 'r1',
    user_id: 'u1',
    name: 'Test recipe',
    notes: null,
    servings: 2,
    created_at: '2026-07-18T00:00:00Z',
    updated_at: '2026-07-18T00:00:00Z',
    ingredients: [
      {
        id: 'i1',
        recipe_id: 'r1',
        user_id: 'u1',
        food_id: null,
        name: 'Chicken',
        quantity: 200,
        serving_unit: 'g',
        calories: 330,
        protein_g: 62,
        carbs_g: 0,
        fats_g: 7.2,
        fiber_g: 0,
        sort_order: 0,
        created_at: '2026-07-18T00:00:00Z',
        updated_at: '2026-07-18T00:00:00Z',
      },
      {
        id: 'i2',
        recipe_id: 'r1',
        user_id: 'u1',
        food_id: null,
        name: 'Rice',
        quantity: 150,
        serving_unit: 'g',
        calories: 195,
        protein_g: 4,
        carbs_g: 42,
        fats_g: 0.4,
        fiber_g: 0.6,
        sort_order: 1,
        created_at: '2026-07-18T00:00:00Z',
        updated_at: '2026-07-18T00:00:00Z',
      },
    ],
    ...overrides,
  }
}

describe('scaleRecipeForLog', () => {
  it('scales ingredients by servings / recipe.servings', () => {
    const scaled = scaleRecipeForLog(makeRecipe(), 1) // half of a 2-serving recipe
    expect(scaled).toHaveLength(2)
    expect(scaled[0].quantity).toBe(100)
    expect(scaled[0].calories).toBe(165)
    expect(scaled[1].quantity).toBe(75)
    expect(scaled[1].calories).toBe(98) // 195/2 rounded
  })

  it('keeps full amounts when logging the defined serving count', () => {
    const scaled = scaleRecipeForLog(makeRecipe(), 2)
    expect(scaled[0].quantity).toBe(200)
    expect(scaled[0].calories).toBe(330)
  })
})

describe('sumMacros for recipe ingredients', () => {
  it('totals ingredient macros', () => {
    const totals = sumMacros(makeRecipe().ingredients)
    expect(totals.calories).toBe(525)
    expect(totals.protein_g).toBe(66)
  })
})
