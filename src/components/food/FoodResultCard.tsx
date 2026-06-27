import { ChevronRight, History } from 'lucide-react'
import { SOURCE_LABELS } from '@/lib/foodSearch'
import type { FoodSearchResult } from '@/types/food'
import { formatMacro } from '@/types/food'

export function FoodResultCard({
  food,
  onSelect,
}: {
  food: FoodSearchResult
  onSelect: (food: FoodSearchResult) => void
}) {
  const sourceLabel = food.recent ? 'Recently logged' : SOURCE_LABELS[food.source]

  return (
    <button
      type="button"
      onClick={() => onSelect(food)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors duration-200 hover:border-primary hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{food.name}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
          {food.recent && <History className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />}
          {[food.brand, sourceLabel].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-1 text-xs text-muted">
          {formatMacro(food.calories, 'kcal')} per {food.servingSize}
          {food.servingUnit}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
    </button>
  )
}
