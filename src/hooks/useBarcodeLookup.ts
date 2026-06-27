import { useCallback, useState } from 'react'
import { lookupOffBarcode } from '@/lib/openFoodFacts'
import type { FoodSearchResult } from '@/types/food'

export function useBarcodeLookup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastBarcode, setLastBarcode] = useState<string | null>(null)

  const lookup = useCallback(async (barcode: string): Promise<FoodSearchResult | null> => {
    const cleaned = barcode.replace(/\D/g, '')
    setError(null)
    setLoading(true)
    setLastBarcode(cleaned || null)

    try {
      const product = await lookupOffBarcode(barcode)
      if (!product) {
        setError('No product found for this barcode in Open Food Facts.')
        return null
      }
      return product
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Barcode lookup failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setLastBarcode(null)
  }, [])

  return { lookup, loading, error, lastBarcode, clearError }
}
