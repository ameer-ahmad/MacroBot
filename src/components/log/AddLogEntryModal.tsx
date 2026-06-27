import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import {
  createLogEntry,
  fetchFoods,
  MEAL_LABELS,
  MEAL_ORDER,
  queryKeys,
} from '@/lib/api'
import { macrosFromFoodSource, scaleMacros } from '@/lib/macros'
import type { Food, MealType } from '@/types/database'
import type { FoodSearchResult } from '@/types/food'
import { formatMacro } from '@/types/food'

type FoodInput = Food | FoodSearchResult

function servingUnit(food: FoodInput): string {
  return 'serving_unit' in food ? food.serving_unit : food.servingUnit
}

function foodId(food: FoodInput): string | null {
  return 'id' in food ? food.id : null
}

const inputClass =
  'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function AddLogEntryModal({
  open,
  onClose,
  date,
  initialMeal = 'snack',
  initialFood,
}: {
  open: boolean
  onClose: () => void
  date: string
  initialMeal?: MealType
  initialFood?: FoodInput | null
}) {
  const queryClient = useQueryClient()
  const [meal, setMeal] = useState<MealType>(initialMeal)
  const [mode, setMode] = useState<'library' | 'manual'>(initialFood ? 'library' : 'library')
  const [quantity, setQuantity] = useState('1')
  const [librarySearch, setLibrarySearch] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodInput | null>(initialFood ?? null)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [fiber, setFiber] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: foods = [] } = useQuery({
    queryKey: queryKeys.foods,
    queryFn: fetchFoods,
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setMeal(initialMeal)
    setSelectedFood(initialFood ?? null)
    setMode(initialFood ? 'library' : 'library')
    setQuantity('1')
    setError(null)
  }, [open, initialMeal, initialFood])

  const mutation = useMutation({
    mutationFn: createLogEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.logEntries(date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyTotals(date) })
      onClose()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to add entry')
    },
  })

  if (!open) return null

  const qty = Number(quantity) || 1
  const previewMacros =
    mode === 'library' && selectedFood
      ? macrosFromFoodSource(selectedFood, qty)
      : mode === 'manual'
        ? scaleMacros(
            {
              calories: Number(calories) || 0,
              protein_g: Number(protein) || 0,
              carbs_g: Number(carbs) || 0,
              fats_g: Number(fats) || 0,
              fiber_g: Number(fiber) || 0,
            },
            qty,
          )
        : null

  const filteredFoods = foods.filter((food) => {
    const q = librarySearch.toLowerCase()
    return food.name.toLowerCase().includes(q) || food.brand?.toLowerCase().includes(q)
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'library') {
      if (!selectedFood) {
        setError('Select a food from your library')
        return
      }
      const macros = macrosFromFoodSource(selectedFood, qty)
      mutation.mutate({
        logged_date: date,
        meal,
        food_id: foodId(selectedFood),
        name: selectedFood.name,
        quantity: qty,
        serving_unit: servingUnit(selectedFood),
        ...macros,
      })
      return
    }

    if (!name.trim()) {
      setError('Enter a food name')
      return
    }

    const macros = scaleMacros(
      {
        calories: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fats_g: Number(fats) || 0,
        fiber_g: Number(fiber) || 0,
      },
      qty,
    )

    mutation.mutate({
      logged_date: date,
      meal,
      food_id: null,
      name: name.trim(),
      quantity: qty,
      serving_unit: 'serving',
      ...macros,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-labelledby="add-log-title"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 id="add-log-title" className="text-lg font-semibold text-foreground">
            Add to log
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-muted hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-5 py-4">
            {error && (
              <p className="rounded-xl border border-fats/30 bg-fats/10 px-3 py-2 text-sm text-fats">
                {error}
              </p>
            )}

            <div>
              <span className="mb-1.5 block text-sm font-medium text-foreground">Meal</span>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_ORDER.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMeal(m)}
                    className={[
                      'cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition-colors duration-200',
                      meal === m
                        ? 'border-primary bg-accent text-primary'
                        : 'border-border text-muted hover:text-foreground',
                    ].join(' ')}
                  >
                    {MEAL_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {(['library', 'manual'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    'flex-1 cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors duration-200',
                    mode === m
                      ? 'border-primary bg-accent text-primary'
                      : 'border-border text-muted',
                  ].join(' ')}
                >
                  {m === 'library' ? 'My foods' : 'Manual'}
                </button>
              ))}
            </div>

            <label className="block text-sm">
              <span className="font-medium text-foreground">Quantity (servings)</span>
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`mt-1 ${inputClass}`}
                required
              />
            </label>

            {mode === 'library' && (
              <>
                {selectedFood && (
                  <div className="rounded-lg border border-primary bg-accent px-3 py-2 text-sm">
                    <span className="text-muted">Selected: </span>
                    <span className="font-medium text-foreground">{selectedFood.name}</span>
                  </div>
                )}
                <input
                  type="search"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search saved foods…"
                  className={inputClass}
                  aria-label="Search saved foods"
                />
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {filteredFoods.length === 0 && (
                    <p className="text-sm text-muted">No saved foods. Search and save foods first.</p>
                  )}
                  {filteredFoods.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => setSelectedFood(food)}
                      className={[
                        'w-full cursor-pointer rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-200',
                        selectedFood && 'id' in selectedFood && selectedFood.id === food.id
                          ? 'border-primary bg-accent'
                          : 'border-border hover:bg-accent',
                      ].join(' ')}
                    >
                      <span className="font-medium text-foreground">{food.name}</span>
                      <span className="ml-2 text-muted">
                        {formatMacro(Number(food.calories), 'kcal')}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {mode === 'manual' && (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="font-medium text-foreground">Name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`mt-1 ${inputClass}`}
                    required
                  />
                </label>
                {(
                  [
                    ['Calories (kcal)', calories, setCalories],
                    ['Protein (g)', protein, setProtein],
                    ['Carbs (g)', carbs, setCarbs],
                    ['Fats (g)', fats, setFats],
                    ['Fiber (g)', fiber, setFiber],
                  ] as const
                ).map(([label, value, setter]) => (
                  <label key={label} className="block text-sm">
                    <span className="font-medium text-foreground">{label}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                ))}
                <p className="text-xs text-muted">Macros are per serving; quantity multiplies totals.</p>
              </div>
            )}

            {previewMacros && (
              <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                <span className="text-muted">Total: </span>
                <span className="font-medium text-foreground">
                  {formatMacro(previewMacros.calories, 'kcal')} · P {previewMacros.protein_g}g · C{' '}
                  {previewMacros.carbs_g}g · F {previewMacros.fats_g}g · Fiber {previewMacros.fiber_g}g
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-border px-5 py-4">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {mutation.isPending ? 'Adding…' : 'Add to log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
