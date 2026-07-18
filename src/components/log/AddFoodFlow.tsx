import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  Camera,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { BarcodeNotFound } from '@/components/food/BarcodeNotFound'
import { BarcodeScanner } from '@/components/food/BarcodeScanner'
import { FoodResultCard } from '@/components/food/FoodResultCard'
import { RecipeResultCard } from '@/components/food/RecipeResultCard'
import { AiAssistant } from '@/components/log/AiAssistant'
import { useBarcodeLookup } from '@/hooks/useBarcodeLookup'
import { useDebounce } from '@/hooks/useDebounce'
import {
  createRecipe,
  deleteRecipe,
  fetchRecipe,
  MEAL_LABELS,
  MEAL_ORDER,
  queryKeys,
  scaleRecipeForLog,
  sumMacros,
  updateRecipe,
  type RecipeIngredientInput,
} from '@/lib/api'
import { createLogEntryQueued, logRecipeQueued } from '@/lib/offlineQueue'
import { searchLoggableFoods } from '@/lib/foodSearch'
import { amountFieldConfig, macrosForAmount, scaleMacros } from '@/lib/macros'
import { fetchUsdaFood, isUsdaConfigured } from '@/lib/usda'
import type { MealType, RecipeWithIngredients } from '@/types/database'
import type { FoodSearchResult, RecipeSearchResult } from '@/types/food'
import { formatMacro } from '@/types/food'

type Step =
  | 'search'
  | 'manual'
  | 'configure'
  | 'ai'
  | 'recipe'
  | 'configureRecipe'
  | 'pickIngredient'
  | 'configureIngredient'
  | 'manualIngredient'
  | 'aiIngredient'

interface DraftIngredient {
  localId: string
  food_id: string | null
  name: string
  quantity: number
  serving_unit: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
  /** Macros per 1 unit of quantity — used when the amount is edited. */
  perUnit: {
    calories: number
    protein_g: number
    carbs_g: number
    fats_g: number
    fiber_g: number
  }
}

const inputClass =
  'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

function newLocalId() {
  return crypto.randomUUID()
}

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

  // Recipe builder state
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
  const [recipeName, setRecipeName] = useState('')
  const [recipeServings, setRecipeServings] = useState('1')
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithIngredients | null>(null)
  const [recipeLogServings, setRecipeLogServings] = useState('1')

  const debouncedQuery = useDebounce(query, 400)

  const {
    lookup,
    loading: barcodeLoading,
    error: barcodeError,
    lastBarcode,
    clearError,
  } = useBarcodeLookup()

  const pickingForRecipe =
    step === 'pickIngredient' ||
    step === 'configureIngredient' ||
    step === 'manualIngredient' ||
    step === 'aiIngredient'

  const { data: results, isFetching } = useQuery({
    queryKey: queryKeys.loggableSearch(debouncedQuery),
    queryFn: () => searchLoggableFoods(debouncedQuery),
    enabled: step === 'search' || step === 'pickIngredient',
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

  const saveRecipeMutation = useMutation({
    mutationFn: async () => {
      const servings = Number(recipeServings) || 1
      const ingredients: RecipeIngredientInput[] = draftIngredients.map((ing, index) => ({
        food_id: ing.food_id,
        name: ing.name,
        quantity: ing.quantity,
        serving_unit: ing.serving_unit,
        calories: ing.calories,
        protein_g: ing.protein_g,
        carbs_g: ing.carbs_g,
        fats_g: ing.fats_g,
        fiber_g: ing.fiber_g,
        sort_order: index,
      }))

      if (editingRecipeId) {
        return updateRecipe(editingRecipeId, {
          name: recipeName.trim(),
          servings,
          ingredients,
        })
      }
      return createRecipe({
        name: recipeName.trim(),
        servings,
        ingredients,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes })
      queryClient.invalidateQueries({ queryKey: ['loggable-search'] })
      resetRecipeDraft()
      setStep('search')
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save recipe'),
  })

  const logRecipeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRecipe) throw new Error('No recipe selected')
      return logRecipeQueued({
        recipe: selectedRecipe,
        date,
        meal,
        servings: Number(recipeLogServings) || 1,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.logEntries(date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyTotals(date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recentFoods })
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to log recipe'),
  })

  const deleteRecipeMutation = useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes })
      queryClient.invalidateQueries({ queryKey: ['loggable-search'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to delete recipe'),
  })

  function resetRecipeDraft() {
    setEditingRecipeId(null)
    setRecipeName('')
    setRecipeServings('1')
    setDraftIngredients([])
  }

  function startNewRecipe() {
    resetRecipeDraft()
    setError(null)
    setStep('recipe')
  }

  async function startEditRecipe(card: RecipeSearchResult) {
    setError(null)
    try {
      const full = await fetchRecipe(card.id)
      if (!full) {
        setError('Recipe not found')
        return
      }
      setEditingRecipeId(full.id)
      setRecipeName(full.name)
      setRecipeServings(String(full.servings || 1))
      setDraftIngredients(
        full.ingredients.map((ing) => {
          const qty = Number(ing.quantity) || 1
          return {
            localId: newLocalId(),
            food_id: ing.food_id,
            name: ing.name,
            quantity: qty,
            serving_unit: ing.serving_unit,
            calories: Number(ing.calories),
            protein_g: Number(ing.protein_g),
            carbs_g: Number(ing.carbs_g),
            fats_g: Number(ing.fats_g),
            fiber_g: Number(ing.fiber_g),
            perUnit: {
              calories: Number(ing.calories) / qty,
              protein_g: Number(ing.protein_g) / qty,
              carbs_g: Number(ing.carbs_g) / qty,
              fats_g: Number(ing.fats_g) / qty,
              fiber_g: Number(ing.fiber_g) / qty,
            },
          }
        }),
      )
      setStep('recipe')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe')
    }
  }

  async function selectRecipeForLog(card: RecipeSearchResult) {
    setError(null)
    try {
      const full = await fetchRecipe(card.id)
      if (!full) {
        setError('Recipe not found')
        return
      }
      if (full.ingredients.length === 0) {
        setError('This recipe has no ingredients yet. Edit it to add some.')
        return
      }
      setSelectedRecipe(full)
      setRecipeLogServings(String(full.servings || 1))
      setMeal(initialMeal)
      setStep('configureRecipe')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe')
    }
  }

  async function selectFood(food: FoodSearchResult) {
    setError(null)
    let chosen = food
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
    setQuantity(String(chosen.servingSize || 1))
    setStep(pickingForRecipe ? 'configureIngredient' : 'configure')
  }

  async function handleScan(barcodeValue: string) {
    setScannerOpen(false)
    clearError()
    const product = await lookup(barcodeValue)
    if (product) {
      await selectFood(product)
    }
  }

  function appendIngredient(ing: Omit<DraftIngredient, 'localId' | 'perUnit'> & { perUnit?: DraftIngredient['perUnit'] }) {
    const qty = Number(ing.quantity) || 1
    const perUnit = ing.perUnit ?? {
      calories: ing.calories / qty,
      protein_g: ing.protein_g / qty,
      carbs_g: ing.carbs_g / qty,
      fats_g: ing.fats_g / qty,
      fiber_g: ing.fiber_g / qty,
    }
    setDraftIngredients((prev) => [
      ...prev,
      { ...ing, localId: newLocalId(), perUnit },
    ])
  }

  function handleConfigureSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFood) return
    setError(null)

    const amount = Number(quantity) || selectedFood.servingSize || 1
    const macros = macrosForAmount(selectedFood, amount)

    if (step === 'configureIngredient') {
      appendIngredient({
        food_id: selectedFood.foodId ?? null,
        name: selectedFood.name,
        quantity: amount,
        serving_unit: selectedFood.servingUnit,
        ...macros,
      })
      setSelectedFood(null)
      setStep('recipe')
      return
    }

    mutation.mutate({
      logged_date: date,
      meal,
      food_id: selectedFood.foodId ?? null,
      name: selectedFood.name,
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

    if (step === 'manualIngredient') {
      appendIngredient({
        food_id: null,
        name: name.trim(),
        quantity: qty,
        serving_unit: 'serving',
        ...macros,
      })
      setName('')
      setCalories('')
      setProtein('')
      setCarbs('')
      setFats('')
      setFiber('')
      setQuantity('1')
      setStep('recipe')
      return
    }

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

  function handleSaveRecipe(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!recipeName.trim()) {
      setError('Enter a recipe name')
      return
    }
    if (draftIngredients.length === 0) {
      setError('Add at least one ingredient')
      return
    }
    saveRecipeMutation.mutate()
  }

  function updateDraftAmount(localId: string, value: string) {
    const amount = Number(value) || 0
    setDraftIngredients((prev) =>
      prev.map((ing) => {
        if (ing.localId !== localId) return ing
        return {
          ...ing,
          quantity: amount,
          calories: Math.round(ing.perUnit.calories * amount),
          protein_g: Math.round(ing.perUnit.protein_g * amount * 10) / 10,
          carbs_g: Math.round(ing.perUnit.carbs_g * amount * 10) / 10,
          fats_g: Math.round(ing.perUnit.fats_g * amount * 10) / 10,
          fiber_g: Math.round(ing.perUnit.fiber_g * amount * 10) / 10,
        }
      }),
    )
  }

  const recipes = results?.recipes ?? []
  const recent = results?.recent ?? []
  const saved = results?.saved ?? []
  const usda = results?.usda ?? []
  const hasFoodResults = recent.length > 0 || saved.length > 0 || usda.length > 0
  const hasResults = recipes.length > 0 || hasFoodResults
  const draftTotals = sumMacros(draftIngredients)
  const recipeLogPreview =
    selectedRecipe && Number(recipeLogServings) > 0
      ? sumMacros(scaleRecipeForLog(selectedRecipe, Number(recipeLogServings) || 1))
      : null

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

  function titleForStep(): string {
    switch (step) {
      case 'configure':
      case 'configureRecipe':
        return 'Add to log'
      case 'manual':
        return 'Manual entry'
      case 'ai':
        return 'AI assistant'
      case 'recipe':
        return editingRecipeId ? 'Edit recipe' : 'Create recipe'
      case 'pickIngredient':
        return 'Add ingredient'
      case 'configureIngredient':
        return 'Ingredient amount'
      case 'manualIngredient':
        return 'Manual ingredient'
      case 'aiIngredient':
        return 'AI ingredient'
      default:
        return 'Add food'
    }
  }

  function handleBack() {
    setError(null)
    if (step === 'configureIngredient' || step === 'manualIngredient' || step === 'aiIngredient') {
      setStep('pickIngredient')
      return
    }
    if (step === 'pickIngredient') {
      setStep('recipe')
      return
    }
    if (step === 'configureRecipe') {
      setSelectedRecipe(null)
      setStep('search')
      return
    }
    if (step === 'recipe') {
      resetRecipeDraft()
      setStep('search')
      return
    }
    setStep('search')
  }

  const showBack = step !== 'search'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:items-center sm:pb-4">
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-labelledby="add-food-title"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                type="button"
                onClick={handleBack}
                className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-accent hover:text-foreground"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h3 id="add-food-title" className="text-lg font-semibold text-foreground">
              {titleForStep()}
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

        {(step === 'search' || step === 'pickIngredient') && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="space-y-3 px-5 py-4">
              <div className={`grid gap-2 ${step === 'search' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
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
                    setStep(step === 'pickIngredient' ? 'aiIngredient' : 'ai')
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
                    setQuantity('1')
                    setStep(step === 'pickIngredient' ? 'manualIngredient' : 'manual')
                  }}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:border-primary hover:bg-accent"
                >
                  <PencilLine className="h-4 w-4" aria-hidden="true" />
                  Manual
                </button>
                {step === 'search' && (
                  <button
                    type="button"
                    onClick={startNewRecipe}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:border-primary hover:bg-accent"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Recipe
                  </button>
                )}
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
                    setStep(step === 'pickIngredient' ? 'manualIngredient' : 'manual')
                  }}
                />
              )}

              {error && (
                <p className="rounded-xl border border-fats/30 bg-fats/10 px-3 py-2 text-sm text-fats">
                  {error}
                </p>
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
                  placeholder={
                    step === 'pickIngredient'
                      ? 'Search ingredients…'
                      : 'Search recipes, foods, or USDA…'
                  }
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="Search foods"
                />
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
              {(isFetching || resolvingFood) && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted" aria-label="Searching" />
                </div>
              )}

              {step === 'search' && recipes.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Recipes
                  </h4>
                  {recipes.map((recipe) => (
                    <RecipeResultCard
                      key={recipe.key}
                      recipe={recipe}
                      onSelect={selectRecipeForLog}
                      onEdit={startEditRecipe}
                      onDelete={(r) => {
                        if (confirm(`Delete recipe “${r.name}”?`)) {
                          deleteRecipeMutation.mutate(r.id)
                        }
                      }}
                    />
                  ))}
                </section>
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
                      : step === 'pickIngredient'
                        ? 'Search for an ingredient, or scan / enter manually.'
                        : 'Search recipes and foods, create a recipe, or scan a barcode.'}
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

        {(step === 'configure' || step === 'configureIngredient') && selectedFood && (
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

              {step === 'configure' && mealSelector}

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
                {step === 'configureIngredient'
                  ? 'Add to recipe'
                  : mutation.isPending
                    ? 'Adding…'
                    : 'Add to log'}
              </button>
            </div>
          </form>
        )}

        {step === 'configureRecipe' && selectedRecipe && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              logRecipeMutation.mutate()
            }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              {error && (
                <p className="rounded-xl border border-fats/30 bg-fats/10 px-3 py-2 text-sm text-fats">
                  {error}
                </p>
              )}

              <div className="rounded-xl border border-border bg-background px-3 py-2.5">
                <p className="font-medium text-foreground">{selectedRecipe.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {selectedRecipe.ingredients.length} ingredient
                  {selectedRecipe.ingredients.length === 1 ? '' : 's'} · logs as separate entries
                </p>
              </div>

              {mealSelector}

              <label className="block text-sm">
                <span className="font-medium text-foreground">Servings</span>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={recipeLogServings}
                  onChange={(e) => setRecipeLogServings(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                  required
                />
                <span className="mt-1 block text-xs text-muted">
                  Recipe is defined as {selectedRecipe.servings} serving
                  {Number(selectedRecipe.servings) === 1 ? '' : 's'}; amounts scale from that.
                </span>
              </label>

              {recipeLogPreview && (
                <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                  <span className="text-muted">Total: </span>
                  <span className="font-medium text-foreground">
                    {formatMacro(recipeLogPreview.calories, 'kcal')} · P{' '}
                    {recipeLogPreview.protein_g}g · C {recipeLogPreview.carbs_g}g · F{' '}
                    {recipeLogPreview.fats_g}g · Fiber {recipeLogPreview.fiber_g}g
                  </span>
                </div>
              )}

              <ul className="space-y-1 text-xs text-muted">
                {scaleRecipeForLog(selectedRecipe, Number(recipeLogServings) || 1).map(
                  (ing, i) => (
                    <li key={`${ing.name}-${i}`}>
                      {ing.quantity}
                      {ing.serving_unit} {ing.name} · {formatMacro(ing.calories, 'kcal')}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="border-t border-border px-5 py-4">
              <button
                type="submit"
                disabled={logRecipeMutation.isPending}
                className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {logRecipeMutation.isPending
                  ? 'Adding…'
                  : `Log ${selectedRecipe.ingredients.length} ingredients`}
              </button>
            </div>
          </form>
        )}

        {(step === 'manual' || step === 'manualIngredient') && (
          <form onSubmit={handleManualSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              {error && (
                <p className="rounded-xl border border-fats/30 bg-fats/10 px-3 py-2 text-sm text-fats">
                  {error}
                </p>
              )}

              {step === 'manual' && mealSelector}

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
                {step === 'manualIngredient'
                  ? 'Add to recipe'
                  : mutation.isPending
                    ? 'Adding…'
                    : 'Add to log'}
              </button>
            </div>
          </form>
        )}

        {step === 'ai' && (
          <AiAssistant date={date} initialMeal={meal} onClose={onClose} />
        )}

        {step === 'aiIngredient' && (
          <AiAssistant
            date={date}
            mode="recipe"
            onClose={onClose}
            onAddIngredients={(items) => {
              setDraftIngredients((prev) => [
                ...prev,
                ...items.map((item) => {
                  const qty = item.quantity || 1
                  return {
                    localId: newLocalId(),
                    food_id: item.food_id,
                    name: item.name,
                    quantity: qty,
                    serving_unit: item.serving_unit,
                    calories: item.calories,
                    protein_g: item.protein_g,
                    carbs_g: item.carbs_g,
                    fats_g: item.fats_g,
                    fiber_g: item.fiber_g,
                    perUnit: {
                      calories: item.calories / qty,
                      protein_g: item.protein_g / qty,
                      carbs_g: item.carbs_g / qty,
                      fats_g: item.fats_g / qty,
                      fiber_g: item.fiber_g / qty,
                    },
                  }
                }),
              ])
              setStep('recipe')
            }}
          />
        )}

        {step === 'recipe' && (
          <form onSubmit={handleSaveRecipe} className="flex flex-1 flex-col overflow-hidden">
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              {error && (
                <p className="rounded-xl border border-fats/30 bg-fats/10 px-3 py-2 text-sm text-fats">
                  {error}
                </p>
              )}

              <label className="block text-sm">
                <span className="font-medium text-foreground">Recipe name</span>
                <input
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g. Chicken stir fry"
                  className={`mt-1 ${inputClass}`}
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-foreground">Servings this recipe makes</span>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={recipeServings}
                  onChange={(e) => setRecipeServings(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                  required
                />
              </label>

              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Ingredients</h4>
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setQuery('')
                    setStep('pickIngredient')
                  }}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-primary bg-accent px-3 py-1.5 text-sm font-medium text-primary"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add
                </button>
              </div>

              {draftIngredients.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
                  No ingredients yet. Add foods the same way you log them.
                </p>
              ) : (
                <ul className="space-y-2">
                  {draftIngredients.map((ing) => {
                    const field = amountFieldConfig(ing.serving_unit)
                    return (
                      <li
                        key={ing.localId}
                        className="rounded-xl border border-border bg-background p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">{ing.name}</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {formatMacro(ing.calories, 'kcal')} · P {ing.protein_g}g · C{' '}
                              {ing.carbs_g}g · F {ing.fats_g}g
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDraftIngredients((prev) =>
                                prev.filter((i) => i.localId !== ing.localId),
                              )
                            }
                            className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-accent hover:text-fats"
                            aria-label={`Remove ${ing.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <label className="mt-2 block text-xs">
                          <span className="text-muted">{field.label}</span>
                          <input
                            type="number"
                            min={field.min}
                            step={field.step}
                            value={ing.quantity}
                            onChange={(e) => updateDraftAmount(ing.localId, e.target.value)}
                            className={`mt-1 ${inputClass} py-2 text-sm`}
                          />
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}

              {draftIngredients.length > 0 && (
                <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                  <span className="text-muted">Recipe total: </span>
                  <span className="font-medium text-foreground">
                    {formatMacro(draftTotals.calories, 'kcal')} · P {draftTotals.protein_g}g · C{' '}
                    {draftTotals.carbs_g}g · F {draftTotals.fats_g}g · Fiber {draftTotals.fiber_g}g
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-border px-5 py-4">
              <button
                type="submit"
                disabled={saveRecipeMutation.isPending}
                className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saveRecipeMutation.isPending
                  ? 'Saving…'
                  : editingRecipeId
                    ? 'Save changes'
                    : 'Save recipe'}
              </button>
            </div>
          </form>
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
