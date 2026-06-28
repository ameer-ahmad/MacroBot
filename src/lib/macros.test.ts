import { describe, expect, it } from 'vitest'
import {
  amountFieldConfig,
  isGenericServingUnit,
  isWeightUnit,
  macroProgress,
  macroRemaining,
  macrosForAmount,
  macrosPerUnit,
  scaleMacros,
  shiftDate,
  toDateString,
} from '@/lib/macros'

const perServing = {
  calories: 100,
  protein_g: 10,
  carbs_g: 5,
  fats_g: 2,
  fiber_g: 1,
}

describe('scaleMacros', () => {
  it('scales every macro by the quantity', () => {
    expect(scaleMacros(perServing, 2)).toEqual({
      calories: 200,
      protein_g: 20,
      carbs_g: 10,
      fats_g: 4,
      fiber_g: 2,
    })
  })

  it('rounds calories to whole numbers', () => {
    expect(scaleMacros(perServing, 1.5).calories).toBe(150)
  })
})

describe('macrosForAmount', () => {
  it('scales by amount / servingSize for weight-based foods', () => {
    // 100 kcal per 100 g -> 82 g
    const food = { ...perServing, servingSize: 100, servingUnit: 'g' }
    const m = macrosForAmount(food, 82)
    expect(m.calories).toBe(82)
    expect(m.protein_g).toBe(8.2)
  })

  it('scales by count for count-based foods (4 eggs -> 2 eggs)', () => {
    // basis: 4 eggs = 312 kcal
    const fourEggs = {
      calories: 312,
      protein_g: 24,
      carbs_g: 0,
      fats_g: 20,
      fiber_g: 0,
      servingSize: 4,
      servingUnit: 'egg',
    }
    const m = macrosForAmount(fourEggs, 2)
    expect(m.calories).toBe(156)
    expect(m.protein_g).toBe(12)
  })

  it('treats a missing serving size as 1', () => {
    const food = { ...perServing, servingSize: 0, servingUnit: 'serving' }
    expect(macrosForAmount(food, 3).calories).toBe(300)
  })
})

describe('macrosPerUnit', () => {
  it('divides totals by quantity', () => {
    const m = macrosPerUnit({
      calories: 200,
      protein_g: 20,
      carbs_g: 10,
      fats_g: 4,
      fiber_g: 2,
      quantity: 2,
    })
    expect(m.calories).toBe(100)
    expect(m.protein_g).toBe(10)
  })
})

describe('unit classification', () => {
  it('detects weight/volume units', () => {
    expect(isWeightUnit('g')).toBe(true)
    expect(isWeightUnit('ML')).toBe(true)
    expect(isWeightUnit('egg')).toBe(false)
    expect(isWeightUnit(null)).toBe(false)
  })

  it('detects generic serving units', () => {
    expect(isGenericServingUnit('')).toBe(true)
    expect(isGenericServingUnit('serving')).toBe(true)
    expect(isGenericServingUnit('egg')).toBe(false)
  })
})

describe('amountFieldConfig', () => {
  it('labels grams as an amount', () => {
    expect(amountFieldConfig('g')).toEqual({
      label: 'Amount (g)',
      min: '0',
      step: 'any',
    })
  })

  it('labels generic servings with quarter steps', () => {
    expect(amountFieldConfig('')).toEqual({
      label: 'Quantity (servings)',
      min: '0.25',
      step: '0.25',
    })
  })

  it('labels specific counts with the unit', () => {
    expect(amountFieldConfig('egg').label).toBe('Quantity (egg)')
  })
})

describe('date helpers', () => {
  it('shiftDate moves forward and back', () => {
    expect(shiftDate('2026-06-27', -1)).toBe('2026-06-26')
    expect(shiftDate('2026-06-27', 7)).toBe('2026-07-04')
  })

  it('shiftDate crosses month boundaries', () => {
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('toDateString formats a Date as YYYY-MM-DD', () => {
    expect(toDateString(new Date(2026, 5, 27))).toBe('2026-06-27')
  })
})

describe('progress + remaining', () => {
  it('caps progress at 100%', () => {
    expect(macroProgress(250, 200)).toBe(100)
    expect(macroProgress(100, 200)).toBe(50)
    expect(macroProgress(10, 0)).toBe(0)
  })

  it('never returns negative remaining', () => {
    expect(macroRemaining(250, 200)).toBe(0)
    expect(macroRemaining(150, 200)).toBe(50)
  })
})
