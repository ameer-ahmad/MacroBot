import { Beef, Droplets, Flame, Leaf, Wheat, X } from 'lucide-react'
import { SOURCE_LABELS } from '@/lib/foodSearch'
import type { FoodSearchResult } from '@/types/food'
import { formatMacro } from '@/types/food'

const macroRows = [
  { key: 'calories' as const, label: 'Calories', icon: Flame, color: 'text-primary', unit: 'kcal' as const },
  { key: 'protein_g' as const, label: 'Protein', icon: Beef, color: 'text-protein', unit: 'g' as const },
  { key: 'carbs_g' as const, label: 'Carbs', icon: Wheat, color: 'text-carbs', unit: 'g' as const },
  { key: 'fats_g' as const, label: 'Fats', icon: Droplets, color: 'text-fats', unit: 'g' as const },
  { key: 'fiber_g' as const, label: 'Fiber', icon: Leaf, color: 'text-fiber', unit: 'g' as const },
]

export function FoodPreview({
  food,
  onClose,
  onSave,
  onAddToLog,
  saving,
  saved,
}: {
  food: FoodSearchResult
  onClose: () => void
  onSave: () => void
  onAddToLog?: () => void
  saving: boolean
  saved: boolean
}) {
  const isSaved = food.key.startsWith('saved:')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:items-center sm:pb-4">
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-labelledby="food-preview-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              {SOURCE_LABELS[food.source]}
            </p>
            <h3 id="food-preview-title" className="mt-1 text-lg font-semibold text-foreground">
              {food.name}
            </h3>
            {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-muted">
            Per serving: {food.servingSize} {food.servingUnit}
            {food.barcode && (
              <span className="ml-2">· Barcode {food.barcode}</span>
            )}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {macroRows.map(({ key, label, icon: Icon, color, unit }) => (
              <div
                key={key}
                className="rounded-xl border border-border bg-background px-3 py-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden="true" />
                  <span className="text-xs text-muted">{label}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatMacro(food[key], unit)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {onAddToLog && (
              <button
                type="button"
                onClick={onAddToLog}
                className="w-full cursor-pointer rounded-xl border border-primary bg-accent px-4 py-3 font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
              >
                Add to log
              </button>
            )}

            {!isSaved && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving || saved}
              className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saved ? 'Saved to library' : saving ? 'Saving…' : 'Save to my foods'}
            </button>
          )}

          {isSaved && (
            <p className="text-center text-sm text-primary">Already in your food library</p>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
