import { AlertCircle } from 'lucide-react'

export function BarcodeNotFound({
  barcode,
  onRetry,
  onManualEntry,
}: {
  barcode: string
  onRetry: () => void
  onManualEntry: () => void
}) {
  return (
    <div className="rounded-2xl border border-fats/30 bg-fats/10 p-4">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-fats" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Product not found</p>
          <p className="mt-1 text-sm text-muted">
            No match in Open Food Facts for barcode{' '}
            <span className="font-mono text-foreground">{barcode}</span>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90"
            >
              Scan again
            </button>
            <button
              type="button"
              onClick={onManualEntry}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-accent"
            >
              Try another barcode
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
