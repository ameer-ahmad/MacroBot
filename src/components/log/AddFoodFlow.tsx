import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Camera, Loader2, PencilLine, Search, Sparkles, X } from 'lucide-react'
import { BarcodeNotFound } from '@/components/food/BarcodeNotFound'
import { BarcodeScanner } from '@/components/food/BarcodeScanner'
import { FoodResultCard } from '@/components/food/FoodResultCard'
import { AiAssistant } from '@/components/log/AiAssistant'
import { useBarcodeLookup } from '@/hooks/useBarcodeLookup'
import { useDebounce } from '@/hooks/useDebounce'
import { MEAL_LABELS, MEAL_ORDER, queryKeys } from '@/lib/api'
import { createLogEntryQueued } from '@/lib/offlineQueue'
import { searchLoggableFoods } from '@/lib/foodSearch'
import { amountFieldConfig, macrosForAmount, scaleMacros } from '@/lib/macros'
import { fetchUsdaFood, isUsdaConfigured } from '@/lib/usda'
import type { MealType } from '@/types/database'
import type { FoodSearchResult } from '@/types/food'
import { formatMacro } from '@/types/food'

type Step = 'search' | 'manual' | 'configure' | 'ai'

const inputClass =
  'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function AddFoodFlow({
  date,
  initialMeal = 'snack',
  onClose,
}: {
  date: string
  initialMeal?: MealType
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('search')
  const [meal, setMeal] = useState<MealType>(initialMeal)
  const [query, setQuery] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [resolvingFood, setResolvingFood] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [fiber, setFiber] = useState('')

  const debouncedQuery = useDebounce(query, 400)

  const {
    lookup,
    loading: barcodeLoading,
    error: barcodeError,
    lastBarcode,
    clearError,
  } = useBarcodeLookup()

  const { data: results, isFetching } = useQuery({
    queryKey: queryKeys.loggableSearch(debouncedQuery),
    queryFn: () => searchLoggableFoods(debouncedQuery),
    enabled: step === 'search',
  })

  const mutation = useMutation({
    mutationFn: createLogEntryQueued,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.logEntries(date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyTotals(date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recentFoods })
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add entry'),
  })

  async function selectFood(food: FoodSearchResult) {
    setError(null)
    let chosen = food
    // USDA search results can lack macros until the detail endpoint is queried.
    if (food.source === 'usda' && food.calories === 0 && isUsdaConfigured()) {
      try {
        setResolvingFood(true)
        chosen = await fetchUsdaFood(food.externalId)
      } catch {
        chosen = food
      } finally {
        setResolvingFood(false)
      }
    }
    setSelectedFood(chosen)
    // Default to the food's serving size (grams, count, or 1 serving).
    setQuantity(String(chosen.servingSize || 1))
    setStep('configure')
  }

  async function handleScan(barcodeValue: string) {
    setScannerOpen(false)
    clearError()
    const product = await lookup(barcodeValue)
    if (product) {
      await selectFood(product)
    }
  }

  function handleConfigureSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFood) return
    setError(null)

    const amount = Number(quantity) || selectedFood.servingSize || 1
    const macros = macrosForAmount(selectedFood, amount)

    mutation.mutate({
      logged_date: date,
      meal,
      food_id: selectedFood.foodId ?? null,
      name: selectedFood.name,
      // For weight foods we store the exact amount + unit so edits can rescale.
      quantity: amount,
      serving_unit: selectedFood.servingUnit,
      ...macros,
    })
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Enter a food name')
      return
    }

    const qty = Number(quantity) || 1
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

  const recent = results?.recent ?? []
  const saved = results?.saved ?? []
  const usda = results?.usda ?? []
  const hasResults = recent.length > 0 || saved.length > 0 || usda.length > 0

  const mealSelector = (
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
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:items-center sm:pb-4">
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-labelledby="add-food-title"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            {step !== 'search' && (
              <button
                type="button"
                onClick={() => {
                  setStep('search')
                  setError(null)
                }}
                className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-accent hover:text-foreground"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h3 id="add-food-title" className="text-lg font-semibold text-foreground">
              {step === 'configure'
                ? 'Add to log'
                : step === 'manual'
                  ? 'Manual entry'
                  : step === 'ai'
                    ? 'AI assistant'
                    : 'Add food'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-muted hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'search' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="space-y-3 px-5 py-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearError()
                    setScannerOpen(true)
                  }}
                  disabled={barcodeLoading}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary bg-accent px-3 py-2.5 text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  {barcodeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Camera className="h-4 w-4" aria-hidden="true" />
                  )}
                  Scan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setStep('ai')
                  }}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:border-primary hover:bg-accent"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  AI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setStep('manual')
                  }}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:border-primary hover:bg-accent"
                >
                  <PencilLine className="h-4 w-4" aria-hidden="true" />
                  Manual
                </button>
              </div>

              {barcodeError && lastBarcode && (
                <BarcodeNotFound
                  barcode={lastBarcode}
                  onRetry={() => {
                    clearError()
                    setScannerOpen(true)
                  }}
                  onManualEntry={() => {
                    clearError()
                    setStep('manual')
                  }}
                />
              )}

              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your foods or USDA…"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="Search foods"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
              {(isFetching || resolvingFood) && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted" aria-label="Searching" />
                </div>
              )}

              {recent.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {query.trim() ? 'From your history' : 'Recently logged'}
                  </h4>
                  {recent.map((food) => (
                    <FoodResultCard key={food.key} food={food} onSelect={selectFood} />
                  ))}
                </section>
              )}

              {saved.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Your library
                  </h4>
                  {saved.map((food) => (
                    <FoodResultCard key={food.key} food={food} onSelect={selectFood} />
                  ))}
                </section>
              )}

              {usda.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    USDA database
                  </h4>
                  {usda.map((food) => (
                    <FoodResultCard key={food.key} food={food} onSelect={selectFood} />
                  ))}
                </section>
              )}

              {!isFetching && !resolvingFood && !hasResults && (
                <p className="py-4 text-center text-sm text-muted">
                  {query.trim().length >= 2
                    ? 'No matches found. Try manual entry or a barcode scan.'
                    : query.trim().length === 1
                      ? 'Keep typing to search…'
                      : 'Search your history and the USDA database, or scan a barcode.'}
                </p>
              )}

              {!isUsdaConfigured() && query.trim().length >= 2 && (
                <p className="rounded-xl border border-carbs/30 bg-carbs/10 px-3 py-2 text-xs text-carbs">
                  Add a USDA API key to search the food database. Your logged history still works.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'configure' && selectedFood && (
          <form onSubmit={handleConfigureSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              {error && (
                <p className="rounded-xl border border-fats/30 bg-fats/10 px-3 py-2 text-sm text-fats">
                  {error}
                </p>
              )}

              <div className="rounded-xl border border-border bg-background px-3 py-2.5">
                <p className="font-medium text-foreground">{selectedFood.name}</p>
                {selectedFood.brand && (
                  <p className="text-xs text-muted">{selectedFood.brand}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {formatMacro(selectedFood.calories, 'kcal')} per {selectedFood.servingSize}
                  {selectedFood.servingUnit}
                </p>
              </div>

              {mealSelector}

              {(() => {
                const field = amountFieldConfig(selectedFood.servingUnit)
                return (
                  <label className="block text-sm">
                    <span className="font-medium text-foreground">{field.label}</span>
                    <input
                      type="number"
                      min={field.min}
                      step={field.step}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={`mt-1 ${inputClass}`}
                      required
                    />
                    <span className="mt-1 block text-xs text-muted">
                      Nutrition scales with the amount you enter.
                    </span>
                  </label>
                )
              })()}

              <ConfigurePreview food={selectedFood} amount={Number(quantity) || 0} />
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
        )}

        {step === 'manual' && (
          <form onSubmit={handleManualSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              {error && (
                <p className="rounded-xl border border-fats/30 bg-fats/10 px-3 py-2 text-sm text-fats">
                  {error}
                </p>
              )}

              {mealSelector}

              <label className="block text-sm">
                <span className="font-medium text-foreground">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                  required
                />
              </label>

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
        )}

        {step === 'ai' && (
          <AiAssistant date={date} initialMeal={meal} onClose={onClose} />
        )}
      </div>

      {scannerOpen && (
        <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  )
}

function ConfigurePreview({ food, amount }: { food: FoodSearchResult; amount: number }) {
  const totals = macrosForAmount(food, amount)

  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
      <span className="text-muted">Total: </span>
      <span className="font-medium text-foreground">
        {formatMacro(totals.calories, 'kcal')} · P {totals.protein_g}g · C {totals.carbs_g}g · F{' '}
        {totals.fats_g}g · Fiber {totals.fiber_g}g
      </span>
    </div>
  )
}
