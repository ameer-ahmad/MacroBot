import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { checkSupabaseConnection } from '@/lib/supabase'
import { updateProfile, queryKeys } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import { useProfile } from '@/hooks/useProfile'
import type { ProfileUpdate, UnitSystem } from '@/types/database'

const statusLabels = {
  not_configured: { label: 'Not configured', className: 'text-carbs' },
  connected: { label: 'Connected', className: 'text-primary' },
  error: { label: 'Connection error', className: 'text-fats' },
  loading: { label: 'Checking…', className: 'text-muted' },
} as const

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [units, setUnits] = useState<UnitSystem>('metric')
  const [calorieGoal, setCalorieGoal] = useState('')
  const [proteinGoal, setProteinGoal] = useState('')
  const [carbsGoal, setCarbsGoal] = useState('')
  const [fatsGoal, setFatsGoal] = useState('')
  const [fiberGoal, setFiberGoal] = useState('')

  const { data: status = 'loading' } = useQuery({
    queryKey: ['supabase-status'],
    queryFn: checkSupabaseConnection,
    staleTime: 30_000,
  })

  const connection = statusLabels[status]

  const saveMutation = useMutation({
    mutationFn: (updates: ProfileUpdate) => updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      setEditing(false)
      setError(null)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to save')
    },
  })

  function startEditing() {
    if (!profile) return
    setName(profile.name ?? '')
    setUnits(profile.units)
    setCalorieGoal(String(profile.calorie_goal))
    setProteinGoal(String(profile.protein_goal))
    setCarbsGoal(String(profile.carbs_goal))
    setFatsGoal(String(profile.fats_goal))
    setFiberGoal(String(profile.fiber_goal))
    setEditing(true)
    setError(null)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    saveMutation.mutate({
      name: name.trim() || null,
      units,
      calorie_goal: Number(calorieGoal),
      protein_goal: Number(proteinGoal),
      carbs_goal: Number(carbsGoal),
      fats_goal: Number(fatsGoal),
      fiber_goal: Number(fiberGoal),
    })
  }

  async function handleSignOut() {
    await signOut()
  }

  const goalRows = profile
    ? [
        ['Calories', `${profile.calorie_goal.toLocaleString()} kcal`],
        ['Protein', `${profile.protein_goal} g`],
        ['Carbs', `${profile.carbs_goal} g`],
        ['Fats', `${profile.fats_goal} g`],
        ['Fiber', `${profile.fiber_goal} g`],
      ]
    : []

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted">Manage your goals and account</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-foreground">Account</h3>
        <p className="mt-2 text-sm text-muted">{user?.email}</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:border-fats hover:text-fats"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-foreground">Database</h3>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted">Supabase</span>
          <span className={`font-medium ${connection.className}`}>{connection.label}</span>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Profile & goals</h3>
          {!editing && profile && (
            <button
              type="button"
              onClick={startEditing}
              className="cursor-pointer text-sm font-medium text-primary transition-colors duration-200 hover:opacity-80"
            >
              Edit
            </button>
          )}
        </div>

        {profileLoading && <p className="mt-4 text-sm text-muted">Loading…</p>}

        {!profileLoading && !editing && profile && (
          <dl className="mt-4 space-y-3">
            {profile.name && (
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted">Name</dt>
                <dd className="font-medium text-foreground">{profile.name}</dd>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted">Units</dt>
              <dd className="font-medium capitalize text-foreground">{profile.units}</dd>
            </div>
            {goalRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {!profileLoading && editing && (
          <form onSubmit={handleSave} className="mt-4 space-y-3">
            {error && <p className="text-sm text-fats">{error}</p>}
            <label className="block text-sm">
              <span className="text-muted">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['metric', 'imperial'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setUnits(option)}
                  className={[
                    'cursor-pointer rounded-xl border px-3 py-2 text-sm capitalize',
                    units === option ? 'border-primary bg-accent text-primary' : 'border-border text-muted',
                  ].join(' ')}
                >
                  {option}
                </button>
              ))}
            </div>
            {(
              [
                ['Calories', calorieGoal, setCalorieGoal],
                ['Protein (g)', proteinGoal, setProteinGoal],
                ['Carbs (g)', carbsGoal, setCarbsGoal],
                ['Fats (g)', fatsGoal, setFatsGoal],
                ['Fiber (g)', fiberGoal, setFiberGoal],
              ] as const
            ).map(([label, value, setter]) => (
              <label key={label} className="block text-sm">
                <span className="text-muted">{label}</span>
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                  required
                />
              </label>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm text-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
