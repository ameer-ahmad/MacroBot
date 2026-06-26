import { useQuery } from '@tanstack/react-query'
import { checkSupabaseConnection } from '@/lib/supabase'

const statusLabels = {
  not_configured: { label: 'Not configured', className: 'text-carbs' },
  connected: { label: 'Connected', className: 'text-primary' },
  error: { label: 'Connection error', className: 'text-fats' },
  loading: { label: 'Checking…', className: 'text-muted' },
} as const

export function SettingsPage() {
  const { data: status = 'loading' } = useQuery({
    queryKey: ['supabase-status'],
    queryFn: checkSupabaseConnection,
    staleTime: 30_000,
  })

  const connection = statusLabels[status]

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted">Manage your goals and account</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-foreground">Database</h3>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted">Supabase</span>
          <span className={`font-medium ${connection.className}`}>{connection.label}</span>
        </div>
        {status === 'not_configured' && (
          <p className="mt-2 text-xs text-muted">
            Add your Supabase URL and anon key to <code>.env</code>, then run the migration SQL.
          </p>
        )}
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
