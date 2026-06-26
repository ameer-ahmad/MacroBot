export function SettingsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted">Manage your goals and account</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-foreground">Daily goals</h3>
        <dl className="mt-4 space-y-3">
          {[
            ['Calories', '2,000 kcal'],
            ['Protein', '150 g'],
            ['Carbs', '200 g'],
            ['Fats', '65 g'],
            ['Fiber', '30 g'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <dt className="text-muted">{label}</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-center text-sm text-muted">
        Account and goal editing will be added in Phase 3.
      </p>
    </div>
  )
}
