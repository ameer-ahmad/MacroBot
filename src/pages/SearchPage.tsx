import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Barcode, Loader2, Search } from 'lucide-react'
import { FoodPreview } from '@/components/food/FoodPreview'
import { FoodResultCard } from '@/components/food/FoodResultCard'
import { useDebounce } from '@/hooks/useDebounce'
import { createFood, queryKeys } from '@/lib/api'
import {
  flattenSearchResults,
  searchFoods,
  searchResultToFoodInsert,
} from '@/lib/foodSearch'
import { lookupOffBarcode } from '@/lib/openFoodFacts'
import { fetchUsdaFood, isUsdaConfigured } from '@/lib/usda'
import type { FoodSearchResult } from '@/types/food'

export function SearchPage() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [barcode, setBarcode] = useState('')
  const [selected, setSelected] = useState<FoodSearchResult | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [barcodeError, setBarcodeError] = useState<string | null>(null)
  const [barcodeLoading, setBarcodeLoading] = useState(false)

  const debouncedQuery = useDebounce(query, 400)

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: queryKeys.foodSearch(debouncedQuery),
    queryFn: () => searchFoods(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
  })

  const saveMutation = useMutation({
    mutationFn: (food: FoodSearchResult) => createFood(searchResultToFoodInsert(food)),
    onSuccess: (_saved, food) => {
      setSavedKey(food.key)
      queryClient.invalidateQueries({ queryKey: queryKeys.foods })
      queryClient.invalidateQueries({ queryKey: queryKeys.foodSearch(debouncedQuery) })
    },
  })

  const results = data ? flattenSearchResults(data) : []
  const showSearchResults = debouncedQuery.trim().length >= 2

  async function handleSelect(food: FoodSearchResult) {
    if (food.source === 'usda' && food.calories === 0 && isUsdaConfigured()) {
      try {
        const detailed = await fetchUsdaFood(food.externalId)
        setSelected(detailed)
        return
      } catch {
        // Fall back to search result if detail fetch fails
      }
    }
    setSelected(food)
    setSavedKey(null)
  }

  async function handleBarcodeLookup(e: React.FormEvent) {
    e.preventDefault()
    setBarcodeError(null)
    setBarcodeLoading(true)

    try {
      const product = await lookupOffBarcode(barcode)
      if (!product) {
        setBarcodeError('No product found for this barcode.')
        return
      }
      setSelected(product)
      setSavedKey(null)
    } catch (err) {
      setBarcodeError(err instanceof Error ? err.message : 'Barcode lookup failed')
    } finally {
      setBarcodeLoading(false)
    }
  }

  function closePreview() {
    setSelected(null)
    setSavedKey(null)
    saveMutation.reset()
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-foreground">Find Food</h2>
        <p className="text-sm text-muted">Search USDA & Open Food Facts, or look up by barcode</p>
      </section>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods..."
          className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Search foods"
        />
      </div>

      {!isUsdaConfigured() && (
        <p className="rounded-xl border border-carbs/30 bg-carbs/10 px-4 py-3 text-sm text-carbs">
          Add <code className="text-xs">VITE_USDA_API_KEY</code> to enable USDA search. Open Food
          Facts search still works without a key.
        </p>
      )}

      {showSearchResults && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Results</h3>
            {(isLoading || isFetching) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="Searching" />
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-fats/30 bg-fats/10 px-4 py-3 text-sm text-fats">
              {error instanceof Error ? error.message : 'Search failed'}
            </p>
          )}

          {!isLoading && !error && results.length === 0 && (
            <p className="text-sm text-muted">No foods found. Try a different search term.</p>
          )}

          <div className="space-y-2">
            {results.map((food) => (
              <FoodResultCard key={food.key} food={food} onSelect={handleSelect} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Barcode className="h-5 w-5 text-primary" aria-hidden="true" />
          Barcode lookup
        </h3>
        <p className="mt-1 text-xs text-muted">Enter a barcode manually. Camera scanning comes in Phase 5.</p>

        <form onSubmit={handleBarcodeLookup} className="mt-3 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="e.g. 0123456789012"
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Barcode"
          />
          <button
            type="submit"
            disabled={barcodeLoading || !barcode.trim()}
            className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {barcodeLoading ? '…' : 'Look up'}
          </button>
        </form>

        {barcodeError && (
          <p className="mt-2 text-sm text-fats">{barcodeError}</p>
        )}
      </section>

      {selected && (
        <FoodPreview
          food={selected}
          onClose={closePreview}
          onSave={() => saveMutation.mutate(selected)}
          saving={saveMutation.isPending}
          saved={savedKey === selected.key || selected.key.startsWith('saved:')}
        />
      )}
    </div>
  )
}
