import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { completeOnboarding } from '@/lib/auth'
import { queryKeys } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'
import { useProfile } from '@/hooks/useProfile'
import {
  AuthField,
  AuthLayout,
  authButtonClass,
} from '@/components/auth/AuthLayout'
import type { UnitSystem } from '@/types/database'

const defaultGoals = {
  calorie_goal: 2000,
  protein_goal: 150,
  carbs_goal: 200,
  fats_goal: 65,
  fiber_goal: 30,
}

export function OnboardingPage() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState(
    profile?.name ?? (user?.user_metadata?.name as string | undefined) ?? '',
  )
  const [units, setUnits] = useState<UnitSystem>(profile?.units ?? 'metric')
  const [calorieGoal, setCalorieGoal] = useState(String(profile?.calorie_goal ?? defaultGoals.calorie_goal))
  const [proteinGoal, setProteinGoal] = useState(String(profile?.protein_goal ?? defaultGoals.protein_goal))
  const [carbsGoal, setCarbsGoal] = useState(String(profile?.carbs_goal ?? defaultGoals.carbs_goal))
  const [fatsGoal, setFatsGoal] = useState(String(profile?.fats_goal ?? defaultGoals.fats_goal))
  const [fiberGoal, setFiberGoal] = useState(String(defaultGoals.fiber_goal))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!profile && !user) return
    if (profile?.name) setName(profile.name)
    else if (user?.user_metadata?.name) setName(user.user_metadata.name as string)
    if (profile) {
      setUnits(profile.units)
      setCalorieGoal(String(profile.calorie_goal))
      setProteinGoal(String(profile.protein_goal))
      setCarbsGoal(String(profile.carbs_goal))
      setFatsGoal(String(profile.fats_goal))
      setFiberGoal(String(profile.fiber_goal))
    }
  }, [profile, user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await completeOnboarding({
        name: name.trim() || null,
        units,
        calorie_goal: Number(calorieGoal),
        protein_goal: Number(proteinGoal),
        carbs_goal: Number(carbsGoal),
        fats_goal: Number(fatsGoal),
        fiber_goal: Number(fiberGoal),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goals')
    } finally {
      setSubmitting(false)
    }
  }

  const numberField = (label: string, id: string, value: string, onChange: (v: string) => void, unit: string) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-12 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          required
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
          {unit}
        </span>
      </div>
    </div>
  )

  return (
    <AuthLayout
      title="Set your goals"
      subtitle="We'll use these targets to track your daily progress"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-xl border border-fats/30 bg-fats/10 px-4 py-3 text-sm text-fats">
            {error}
          </p>
        )}

        <AuthField label="Name" id="name" value={name} onChange={setName} autoComplete="name" />

        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">Units</span>
          <div className="grid grid-cols-2 gap-2">
            {(['metric', 'imperial'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setUnits(option)}
                className={[
                  'cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium capitalize transition-colors duration-200',
                  units === option
                    ? 'border-primary bg-accent text-primary'
                    : 'border-border bg-card text-muted hover:text-foreground',
                ].join(' ')}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {numberField('Daily calories', 'calories', calorieGoal, setCalorieGoal, 'kcal')}
        {numberField('Protein', 'protein', proteinGoal, setProteinGoal, 'g')}
        {numberField('Carbs', 'carbs', carbsGoal, setCarbsGoal, 'g')}
        {numberField('Fats', 'fats', fatsGoal, setFatsGoal, 'g')}
        {numberField('Fiber', 'fiber', fiberGoal, setFiberGoal, 'g')}

        <button type="submit" disabled={submitting} className={authButtonClass}>
          {submitting ? 'Saving…' : 'Start tracking'}
        </button>
      </form>
    </AuthLayout>
  )
}
