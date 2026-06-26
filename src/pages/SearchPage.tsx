import { Barcode, Search } from 'lucide-react'

export function SearchPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-foreground">Find Food</h2>
        <p className="text-sm text-muted">Search USDA or scan a barcode</p>
      </section>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search foods..."
          className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Search foods"
        />
      </div>

      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-foreground shadow-sm transition-colors duration-200 hover:border-primary hover:bg-accent"
      >
        <Barcode className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="font-medium">Scan barcode</span>
      </button>

      <p className="text-center text-sm text-muted">
        Food search and barcode scanning will be connected in Phase 4–5.
      </p>
    </div>
  )
}
