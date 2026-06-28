import { describe, expect, it } from 'vitest'
import {
  dedupeRecentFoods,
  foodToSearchResult,
  logEntryToRecentFood,
  searchResultToFoodInsert,
} from '@/lib/foodSearch'
import type { Food, LogEntry } from '@/types/database'

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'l1',
    user_id: 'u1',
    food_id: null,
    logged_date: '2026-06-27',
    meal: 'breakfast',
    name: 'Egg whites',
    quantity: 100,
    serving_unit: 'g',
    calories: 52,
    protein_g: 11,
    carbs_g: 0.7,
    fats_g: 0.2,
    fiber_g: 0,
    notes: null,
    created_at: '2026-06-27T08:00:00Z',
    updated_at: '2026-06-27T08:00:00Z',
    ...overrides,
  }
}

function makeFood(overrides: Partial<Food> = {}): Food {
  return {
    id: 'f1',
    user_id: 'u1',
    name: 'Chicken breast',
    brand: 'Brand',
    serving_size: 100,
    serving_unit: 'g',
    calories: 165,
    protein_g: 31,
    carbs_g: 0,
    fats_g: 3.6,
    fiber_g: 0,
    barcode: null,
    source: 'custom',
    external_id: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

describe('logEntryToRecentFood', () => {
  it('keeps the last logged amount as the serving basis', () => {
    const food = logEntryToRecentFood(makeLogEntry())
    expect(food.recent).toBe(true)
    expect(food.servingSize).toBe(100)
    expect(food.servingUnit).toBe('g')
    expect(food.calories).toBe(52)
  })

  it('keys by food_id when present, else by lowercased name', () => {
    expect(logEntryToRecentFood(makeLogEntry({ food_id: 'abc' })).key).toBe(
      'recent:abc',
    )
    expect(logEntryToRecentFood(makeLogEntry({ name: 'Big Mac' })).key).toBe(
      'recent:big mac',
    )
  })

  it('defaults serving size to 1 when quantity is missing', () => {
    expect(logEntryToRecentFood(makeLogEntry({ quantity: 0 })).servingSize).toBe(1)
  })
})

describe('dedupeRecentFoods', () => {
  it('keeps only the first (most recent) occurrence of each food', () => {
    const entries = [
      makeLogEntry({ id: 'a', name: 'Oats', quantity: 40 }),
      makeLogEntry({ id: 'b', name: 'Oats', quantity: 80 }),
      makeLogEntry({ id: 'c', name: 'Banana' }),
    ]
    const result = dedupeRecentFoods(entries)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Oats')
    expect(result[0].servingSize).toBe(40)
    expect(result[1].name).toBe('Banana')
  })

  it('dedupes by food_id across different names', () => {
    const entries = [
      makeLogEntry({ id: 'a', food_id: 'x', name: 'Rice' }),
      makeLogEntry({ id: 'b', food_id: 'x', name: 'White rice' }),
    ]
    expect(dedupeRecentFoods(entries)).toHaveLength(1)
  })
})

describe('foodToSearchResult <-> searchResultToFoodInsert', () => {
  it('maps a saved food into a search result', () => {
    const result = foodToSearchResult(makeFood())
    expect(result.key).toBe('saved:f1')
    expect(result.foodId).toBe('f1')
    expect(result.servingSize).toBe(100)
    expect(result.externalId).toBe('f1') // falls back to id
  })

  it('round-trips macros + serving info back into an insert', () => {
    const insert = searchResultToFoodInsert(foodToSearchResult(makeFood()))
    expect(insert.name).toBe('Chicken breast')
    expect(insert.serving_size).toBe(100)
    expect(insert.calories).toBe(165)
    expect(insert.source).toBe('custom')
  })
})
