import { Plus } from 'lucide-react'

const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const

export function LogPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-foreground">Food Log</h2>
        <p className="text-sm text-muted">Log what you eat throughout the day</p>
      </section>

      <div className="space-y-4">
        {meals.map((meal) => (
          <section
            key={meal}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{meal}</h3>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            </div>
            <p className="mt-3 text-sm text-muted">No items logged yet.</p>
          </section>
        ))}
      </div>
    </div>
  )
}
