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
