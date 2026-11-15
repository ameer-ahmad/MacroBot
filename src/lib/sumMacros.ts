import type { Macros } from '../types/database.ts'

export function sumMacros(entries: readonly Macros[]): Macros {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + Number(entry.calories),
      protein_g: totals.protein_g + Number(entry.protein_g),
      carbs_g: totals.carbs_g + Number(entry.carbs_g),
      fats_g: totals.fats_g + Number(entry.fats_g),
      fiber_g: totals.fiber_g + Number(entry.fiber_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0 },
  )
}
