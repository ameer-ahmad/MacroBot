import { BookOpen, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RecipeSearchResult } from '@/types/food'
import { formatMacro } from '@/types/food'

export function RecipeResultCard({
  recipe,
  onSelect,
  onEdit,
  onDelete,
}: {
  recipe: RecipeSearchResult
  onSelect: (recipe: RecipeSearchResult) => void
  onEdit?: (recipe: RecipeSearchResult) => void
  onDelete?: (recipe: RecipeSearchResult) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handlePointer(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [menuOpen])

  const showMenu = Boolean(onEdit || onDelete)

  return (
    <div className="relative flex w-full items-stretch gap-1 rounded-xl border border-border bg-card shadow-sm transition-colors duration-200 hover:border-primary">
      <button
        type="button"
        onClick={() => onSelect(recipe)}
        className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{recipe.name}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <BookOpen className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
            Recipe · {recipe.ingredientCount} ingredient
            {recipe.ingredientCount === 1 ? '' : 's'} · {recipe.servings} serving
            {recipe.servings === 1 ? '' : 's'}
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatMacro(recipe.calories, 'kcal')} total
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
      </button>

      {showMenu && (
        <div className="relative flex items-center pr-2" ref={menuRef}>
          <button
            type="button"
            aria-label={`Manage ${recipe.name}`}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="cursor-pointer rounded-lg p-2 text-muted hover:bg-accent hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit(recipe)
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(recipe)
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-fats hover:bg-fats/10"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
