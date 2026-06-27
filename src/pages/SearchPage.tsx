import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Barcode, Camera, Loader2, Search } from 'lucide-react'
import { BarcodeNotFound } from '@/components/food/BarcodeNotFound'
import { BarcodeScanner } from '@/components/food/BarcodeScanner'
import { FoodPreview } from '@/components/food/FoodPreview'
import { FoodResultCard } from '@/components/food/FoodResultCard'
import { useBarcodeLookup } from '@/hooks/useBarcodeLookup'
import { useDebounce } from '@/hooks/useDebounce'
import { createFood, queryKeys } from '@/lib/api'
import {
  flattenSearchResults,
  searchFoods,
  searchResultToFoodInsert,
} from '@/lib/foodSearch'
import { fetchUsdaFood, isUsdaConfigured } from '@/lib/usda'
import type { FoodSearchResult } from '@/types/food'

export function SearchPage() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [barcode, setBarcode] = useState('')
  const [selected, setSelected] = useState<FoodSearchResult | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const { lookup, loading: barcodeLoading, error: barcodeError, lastBarcode, clearError } =
    useBarcodeLookup()

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

  async function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearError()
    const product = await lookup(barcode)
    if (product) {
      setSelected(product)
      setSavedKey(null)
    }
  }

  async function handleScan(barcodeValue: string) {
    setScannerOpen(false)
    setBarcode(barcodeValue)
    clearError()
    const product = await lookup(barcodeValue)
    if (product) {
      setSelected(product)
      setSavedKey(null)
    }
  }

  function closePreview() {
    setSelected(null)
    setSavedKey(null)
    saveMutation.reset()
  }

  function openScanner() {
    clearError()
    setScannerOpen(true)
  }

  function focusManualBarcode() {
    clearError()
    document.getElementById('barcode-input')?.focus()
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-foreground">Find Food</h2>
        <p className="text-sm text-muted">Search, scan a barcode, or look one up manually</p>
      </section>

      <button
        type="button"
        onClick={openScanner}
        disabled={barcodeLoading}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary bg-accent px-4 py-4 font-medium text-primary shadow-sm transition-colors duration-200 hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {barcodeLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="h-5 w-5" aria-hidden="true" />
        )}
        {barcodeLoading ? 'Looking up product…' : 'Scan barcode with camera'}
      </button>

      {barcodeError && lastBarcode && (
        <BarcodeNotFound
          barcode={lastBarcode}
          onRetry={openScanner}
          onManualEntry={focusManualBarcode}
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
          Manual barcode entry
        </h3>
        <p className="mt-1 text-xs text-muted">Type a barcode if scanning isn&apos;t available</p>

        <form onSubmit={handleBarcodeSubmit} className="mt-3 flex gap-2">
          <input
            id="barcode-input"
            type="text"
            inputMode="numeric"
            value={barcode}
            onChange={(e) => {
              setBarcode(e.target.value)
              if (barcodeError) clearError()
            }}
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

        {barcodeError && !lastBarcode && (
          <p className="mt-2 text-sm text-fats">{barcodeError}</p>
        )}
      </section>

      {scannerOpen && (
        <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}

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
