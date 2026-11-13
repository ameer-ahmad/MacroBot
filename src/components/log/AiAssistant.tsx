import { useRef, useState, type ChangeEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, ImagePlus, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import {
  analyzeLabel,
  analyzeMeal,
  compressImage,
  type AiLabelFood,
  type AiMealItem,
} from '@/lib/ai'
import { createFood, MEAL_LABELS, MEAL_ORDER, queryKeys } from '@/lib/api'
import { createLogEntryQueued } from '@/lib/offlineQueue'
import type { MealType } from '@/types/database'
import { formatMacro } from '@/types/food'

type AiTab = 'meal' | 'label'

const inputClass =
  'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
const photoButtonClass =
  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-2 py-3 text-sm text-muted transition-colors duration-200 hover:border-primary hover:text-foreground disabled:cursor-default disabled:opacity-50'

export function AiAssistant({
  date,
  initialMeal = 'snack',
  onClose,
  mode = 'log',
  onAddIngredients,
}: {
  date: string
  initialMeal?: MealType
  onClose: () => void
  /** When `recipe`, meal analysis adds ingredients instead of logging. */
  mode?: 'log' | 'recipe'
  onAddIngredients?: (
    items: Array<{
      name: string
      quantity: number
      serving_unit: string
      calories: number
      protein_g: number
      carbs_g: number
      fats_g: number
      fiber_g: number
      food_id: string | null
    }>,
  ) => void
}) {
  const [tab, setTab] = useState<AiTab>('meal')

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
          {(
            [
              ['meal', 'Describe meal'],
              ['label', 'Nutrition label'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={[
                'cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
                tab === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'meal' ? (
        <MealTab
          date={date}
          initialMeal={initialMeal}
          onClose={onClose}
          mode={mode}
          onAddIngredients={onAddIngredients}
        />
      ) : (
        <LabelTab onClose={onClose} />
      )}
    </div>
  )
}

function ImagePicker({
  preview,
  onPick,
  onClear,
  label,
  loading,
  disabled,
}: {
  preview: string | null
  onPick: (file: File) => void
  onClear: () => void
  label: string
  loading: boolean
  disabled: boolean
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  function handleChange({ currentTarget }: ChangeEvent<HTMLInputElement>) {
    const file = currentTarget.files?.[0]
    currentTarget.value = ''
    if (file) onPick(file)
  }

  if (preview) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border">
        <img src={preview} alt="Selected" className="max-h-48 w-full object-cover" />
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="absolute right-2 top-2 cursor-pointer rounded-full bg-foreground/60 p-1.5 text-background hover:bg-foreground/80 disabled:opacity-50"
          aria-label="Remove photo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-foreground">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={loading || disabled}
          className={photoButtonClass}
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Take photo
        </button>
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          disabled={loading || disabled}
          className={photoButtonClass}
        >
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
          Upload photo
        </button>
      </div>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {loading && (
        <p role="status" className="mt-2 text-sm text-muted">
          Preparing photo…
        </p>
      )}
    </fieldset>
  )
}

function usePhoto(setError: (message: string | null) => void) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [loadingPhoto, setLoadingPhoto] = useState(false)

  async function pickPhoto(file: File) {
    setError(null)
    setLoadingPhoto(true)
    try {
      setImageDataUrl(await compressImage(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that image.')
    } finally {
      setLoadingPhoto(false)
    }
  }

  return {
    imageDataUrl,
    loadingPhoto,
    pickPhoto,
    clearPhoto: () => setImageDataUrl(null),
  }
}

type Macros5 = {
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
}

/** Editable AI item that remembers a per-unit basis so amount edits rescale macros. */
type EditMealItem = AiMealItem & { perUnit: Macros5 }

const MACRO_FIELDS = [
  'calories',
  'protein_g',
  'carbs_g',
  'fats_g',
  'fiber_g',
] as const

function toEditItem(item: AiMealItem): EditMealItem {
  const amt = Number(item.amount) || 0
  const per = (v: number) => (amt > 0 ? Number(v) / amt : Number(v) || 0)
  return {
    ...item,
    amount: amt,
    perUnit: {
      calories: per(item.calories),
      protein_g: per(item.protein_g),
      carbs_g: per(item.carbs_g),
      fats_g: per(item.fats_g),
      fiber_g: per(item.fiber_g),
    },
  }
}

function MealTab({
  date,
  initialMeal,
  onClose,
  mode = 'log',
  onAddIngredients,
}: {
  date: string
  initialMeal: MealType
  onClose: () => void
  mode?: 'log' | 'recipe'
  onAddIngredients?: (
    items: Array<{
      name: string
      quantity: number
      serving_unit: string
      calories: number
      protein_g: number
      carbs_g: number
      fats_g: number
      fiber_g: number
      food_id: string | null
    }>,
  ) => void
}) {
  const queryClient = useQueryClient()
  const [meal, setMeal] = useState<MealType>(initialMeal)
  const [text, setText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [items, setItems] = useState<EditMealItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { imageDataUrl, loadingPhoto, pickPhoto, clearPhoto } = usePhoto(setError)
  const isRecipe = mode === 'recipe'

  const logMutation = useMutation({
    mutationFn: async (toLog: EditMealItem[]) => {
      if (isRecipe && onAddIngredients) {
        onAddIngredients(
          toLog.map((item) => {
            const amount = Number(item.amount) || 1
            return {
              name: item.name,
              quantity: amount,
              serving_unit: item.unit?.trim() || 'serving',
              calories: round(item.calories),
              protein_g: round(item.protein_g),
              carbs_g: round(item.carbs_g),
              fats_g: round(item.fats_g),
              fiber_g: round(item.fiber_g),
              food_id: null,
            }
          }),
        )
        return
      }

      for (const item of toLog) {
        const amount = Number(item.amount) || 1
        await createLogEntryQueued({
          logged_date: date,
          meal,
          food_id: null,
          name: item.name,
          // Store the amount + unit so it can be re-logged at a different amount later.
          quantity: amount,
          serving_unit: item.unit?.trim() || 'serving',
          calories: round(item.calories),
          protein_g: round(item.protein_g),
          carbs_g: round(item.carbs_g),
          fats_g: round(item.fats_g),
          fiber_g: round(item.fiber_g),
        })
      }
    },
    onSuccess: () => {
      if (!isRecipe) {
        queryClient.invalidateQueries({ queryKey: queryKeys.logEntries(date) })
        queryClient.invalidateQueries({ queryKey: queryKeys.dailyTotals(date) })
        queryClient.invalidateQueries({ queryKey: queryKeys.recentFoods })
        onClose()
      }
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : 'Failed to log items.'),
  })

  async function handleAnalyze() {
    setError(null)
    if (!text.trim() && !imageDataUrl) {
      setError('Describe your meal or add a photo first.')
      return
    }
    setAnalyzing(true)
    try {
      const result = await analyzeMeal({
        text: text.trim() || undefined,
        imageDataUrl: imageDataUrl ?? undefined,
      })
      if (result.length === 0) {
        setError('Could not identify any foods. Try adding more detail.')
        return
      }
      setItems(result.map(toEditItem))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  function updateItem(index: number, patch: Partial<EditMealItem>) {
    setItems((prev) =>
      prev ? prev.map((it, i) => (i === index ? { ...it, ...patch } : it)) : prev,
    )
  }

  // Changing the amount rescales macros from the fixed per-unit basis.
  function updateAmount(index: number, value: string) {
    const amount = Number(value) || 0
    setItems((prev) =>
      prev
        ? prev.map((it, i) =>
            i === index
              ? {
                  ...it,
                  amount,
                  calories: round(it.perUnit.calories * amount),
                  protein_g: round(it.perUnit.protein_g * amount),
                  carbs_g: round(it.perUnit.carbs_g * amount),
                  fats_g: round(it.perUnit.fats_g * amount),
                  fiber_g: round(it.perUnit.fiber_g * amount),
                }
              : it,
          )
        : prev,
    )
  }

  // Editing a macro directly updates its per-unit basis for future amount changes.
  function updateMacro(index: number, field: (typeof MACRO_FIELDS)[number], value: string) {
    const v = Number(value) || 0
    setItems((prev) =>
      prev
        ? prev.map((it, i) => {
            if (i !== index) return it
            const amt = Number(it.amount) || 0
            return {
              ...it,
              [field]: v,
              perUnit: { ...it.perUnit, [field]: amt > 0 ? v / amt : it.perUnit[field] },
            }
          })
        : prev,
    )
  }

  function removeItem(index: number) {
    setItems((prev) => {
      if (!prev) return prev
      const next = prev.filter((_, i) => i !== index)
      return next.length ? next : null
    })
  }

  const totals = (items ?? []).reduce(
    (acc, it) => ({
      calories: acc.calories + (Number(it.calories) || 0),
      protein_g: acc.protein_g + (Number(it.protein_g) || 0),
      carbs_g: acc.carbs_g + (Number(it.carbs_g) || 0),
      fats_g: acc.fats_g + (Number(it.fats_g) || 0),
      fiber_g: acc.fiber_g + (Number(it.fiber_g) || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0 },
  )

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {error && (
          <p role="alert" className="rounded-xl border border-fats/30 bg-fats/10 px-3 py-2 text-sm text-fats">
            {error}
          </p>
        )}

        {!items && (
          <>
            <label className="block text-sm">
              <span className="font-medium text-foreground">Describe your meal</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="e.g. 4 eggs cooked in 5g of butter, or 423g of meat lovers pizza"
                className={`mt-1 resize-none ${inputClass}`}
              />
            </label>

            <ImagePicker
              preview={imageDataUrl}
              onPick={pickPhoto}
              onClear={clearPhoto}
              label="Food photo (optional)"
              loading={loadingPhoto}
              disabled={analyzing}
            />

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || loadingPhoto}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {analyzing ? 'Analyzing…' : 'Analyze meal'}
            </button>
          </>
        )}

        {items && (
          <>
            {!isRecipe && (
              <div>
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Meal
                </span>
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
            )}

            <p className="text-xs text-muted">
              {isRecipe
                ? 'Review the AI estimate and tweak anything before adding to the recipe.'
                : 'Review the AI estimate and tweak anything before logging.'}
            </p>

            {items.map((item, index) => (
              <div
                key={index}
                className="space-y-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-start gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    className="flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
                    aria-label="Food name"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-accent hover:text-fats"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <label className="block">
                    <span className="mb-0.5 block text-[10px] font-medium uppercase text-muted">
                      Amount
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.amount}
                      onChange={(e) => updateAmount(index, e.target.value)}
                      className="w-20 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      aria-label="Amount"
                    />
                  </label>
                  <label className="block flex-1">
                    <span className="mb-0.5 block text-[10px] font-medium uppercase text-muted">
                      Unit
                    </span>
                    <input
                      value={item.unit}
                      onChange={(e) => updateItem(index, { unit: e.target.value })}
                      placeholder="g, egg, serving…"
                      className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      aria-label="Unit"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      ['kcal', 'calories'],
                      ['P', 'protein_g'],
                      ['C', 'carbs_g'],
                      ['F', 'fats_g'],
                      ['Fib', 'fiber_g'],
                    ] as const
                  ).map(([label, field]) => (
                    <label key={field} className="block">
                      <span className="mb-0.5 block text-center text-[10px] font-medium uppercase text-muted">
                        {label}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item[field]}
                        onChange={(e) => updateMacro(index, field, e.target.value)}
                        className="w-full rounded-lg border border-border bg-card px-1.5 py-1.5 text-center text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
              <span className="text-muted">Total: </span>
              <span className="font-medium text-foreground">
                {formatMacro(totals.calories, 'kcal')} · P{' '}
                {formatMacro(totals.protein_g)} · C {formatMacro(totals.carbs_g)} · F{' '}
                {formatMacro(totals.fats_g)} · Fiber {formatMacro(totals.fiber_g)}
              </span>
            </div>
          </>
        )}
      </div>

      {items && (
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => setItems(null)}
            className="cursor-pointer rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-accent"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={() => logMutation.mutate(items)}
            disabled={logMutation.isPending}
            className="flex-1 cursor-pointer rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {logMutation.isPending
              ? isRecipe
                ? 'Adding…'
                : 'Logging…'
              : isRecipe
                ? `Add ${items.length} item${items.length > 1 ? 's' : ''} to recipe`
                : `Log ${items.length} item${items.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </>
  )
}

function LabelTab({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [analyzing, setAnalyzing] = useState(false)
  const [food, setFood] = useState<AiLabelFood | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { imageDataUrl, loadingPhoto, pickPhoto, clearPhoto } = usePhoto(setError)

  const saveMutation = useMutation({
    mutationFn: (value: AiLabelFood) =>
      createFood({
        name: value.name,
        brand: value.brand,
        serving_size: Number(value.serving_size) || 1,
        serving_unit: value.serving_unit || 'serving',
        calories: round(value.calories),
        protein_g: round(value.protein_g),
        carbs_g: round(value.carbs_g),
        fats_g: round(value.fats_g),
        fiber_g: round(value.fiber_g),
        source: 'custom',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.foods })
      queryClient.invalidateQueries({ queryKey: ['loggable-search'] })
      setSaved(true)
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : 'Failed to save food.'),
  })

  async function handleAnalyze() {
    setError(null)
    if (!imageDataUrl) {
      setError('Add a photo of the nutrition label first.')
      return
    }
    setAnalyzing(true)
    try {
      setFood(await analyzeLabel({ imageDataUrl }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  function updateFood(patch: Partial<AiLabelFood>) {
    setFood((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  if (saved) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
        <div className="rounded-full bg-accent p-3 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="font-medium text-foreground">Saved to your library</p>
        <p className="text-sm text-muted">
          You can now find it when searching foods.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 cursor-pointer rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {error && (
          <p role="alert" className="rounded-xl border border-fats/30 bg-fats/10 px-3 py-2 text-sm text-fats">
            {error}
          </p>
        )}

        {!food && (
          <>
            <ImagePicker
              preview={imageDataUrl}
              onPick={pickPhoto}
              onClear={clearPhoto}
              label="Nutrition label photo"
              loading={loadingPhoto}
              disabled={analyzing}
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || loadingPhoto || !imageDataUrl}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {analyzing ? 'Reading label…' : 'Read label'}
            </button>
          </>
        )}

        {food && (
          <>
            <p className="text-xs text-muted">
              Check the extracted values before saving to your library.
            </p>

            <label className="block text-sm">
              <span className="font-medium text-foreground">Name</span>
              <input
                value={food.name}
                onChange={(e) => updateFood({ name: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-foreground">Brand</span>
              <input
                value={food.brand ?? ''}
                onChange={(e) => updateFood({ brand: e.target.value || null })}
                className={`mt-1 ${inputClass}`}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="font-medium text-foreground">Serving size</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={food.serving_size}
                  onChange={(e) =>
                    updateFood({ serving_size: Number(e.target.value) || 0 })
                  }
                  className={`mt-1 ${inputClass}`}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-foreground">Unit</span>
                <input
                  value={food.serving_unit}
                  onChange={(e) => updateFood({ serving_unit: e.target.value })}
                  className={`mt-1 ${inputClass}`}
                />
              </label>
            </div>

            {(
              [
                ['Calories (kcal)', 'calories'],
                ['Protein (g)', 'protein_g'],
                ['Carbs (g)', 'carbs_g'],
                ['Fats (g)', 'fats_g'],
                ['Fiber (g)', 'fiber_g'],
              ] as const
            ).map(([label, field]) => (
              <label key={field} className="block text-sm">
                <span className="font-medium text-foreground">{label}</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={food[field]}
                  onChange={(e) =>
                    updateFood({
                      [field]: Number(e.target.value) || 0,
                    } as Partial<AiLabelFood>)
                  }
                  className={`mt-1 ${inputClass}`}
                />
              </label>
            ))}
            <p className="text-xs text-muted">Values are per serving as printed.</p>
          </>
        )}
      </div>

      {food && (
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => setFood(null)}
            className="cursor-pointer rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-accent"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate(food)}
            disabled={saveMutation.isPending}
            className="flex-1 cursor-pointer rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save to library'}
          </button>
        </div>
      )}
    </>
  )
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round((Number(value) || 0) * factor) / factor
}
