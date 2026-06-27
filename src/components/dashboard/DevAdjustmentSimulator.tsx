import { useMemo, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { AdjustmentBanner } from '@/components/dashboard/AdjustmentBanner'
import { computeWeeklyAdjustment, type AdjustmentResult } from '@/lib/adjust'
import {
  GOAL_OPTIONS,
  INTENSITY_OPTIONS,
  lbToKg,
  type GoalDirection,
  type Intensity,
} from '@/lib/goals'
import { shiftDate, toDateString } from '@/lib/macros'
import type { Profile, WeightEntry } from '@/types/database'

/**
 * Dev-only tool to exercise the weekly calorie-adjustment logic with synthetic
 * weight + calorie data, without seeding the database. Renders only in dev
 * builds (gated by import.meta.env.DEV at the call site). Accept/deny here is
 * non-destructive (simulate mode) so it never touches your real profile.
 */
export function DevAdjustmentSimulator({ profile }: { profile: Profile }) {
  const imperial = profile.units === 'imperial'
  const unit = imperial ? 'lb' : 'kg'

  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState<GoalDirection>(profile.goal_direction ?? 'lose')
  const [intensity, setIntensity] = useState<Intensity>(profile.intensity ?? 'moderate')
  // Display-unit inputs (converted to kg when building synthetic entries).
  const [prevWeight, setPrevWeight] = useState(imperial ? '180' : '81.6')
  const [thisWeight, setThisWeight] = useState(imperial ? '179.6' : '81.4')
  const [avgCalories, setAvgCalories] = useState(String(profile.calorie_goal))
  const [loggedDays, setLoggedDays] = useState('5')
  const [resolved, setResolved] = useState<string | null>(null)

  const result = useMemo<AdjustmentResult>(() => {
    const today = toDateString()
    const toKg = (v: string) => (imperial ? lbToKg(Number(v)) : Number(v))

    // Two weigh-ins per week, placed inside each comparison window.
    const weights: WeightEntry[] = [
      mkWeight(shiftDate(today, -13), toKg(prevWeight)),
      mkWeight(shiftDate(today, -10), toKg(prevWeight)),
      mkWeight(shiftDate(today, -8), toKg(prevWeight)),
      mkWeight(shiftDate(today, -6), toKg(thisWeight)),
      mkWeight(shiftDate(today, -3), toKg(thisWeight)),
      mkWeight(shiftDate(today, -1), toKg(thisWeight)),
    ]

    const caloriesByDate = new Map<string, number>()
    const days = Math.max(0, Math.min(7, Number(loggedDays) || 0))
    for (let i = 1; i <= days; i++) {
      caloriesByDate.set(shiftDate(today, -i), Number(avgCalories) || 0)
    }

    const simProfile: Profile = {
      ...profile,
      goal_direction: goal,
      intensity,
      // Ignore the once-per-week gate while simulating.
      last_adjustment_date: null,
    }

    return computeWeeklyAdjustment({
      profile: simProfile,
      weights,
      caloriesByDate,
      today,
    })
  }, [profile, goal, intensity, prevWeight, thisWeight, avgCalories, loggedDays, imperial])

  return (
    <section className="rounded-2xl border border-dashed border-fats/40 bg-fats/5 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 text-left"
      >
        <FlaskConical className="h-4 w-4 text-fats" aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">
          Dev: simulate weekly check
        </span>
        <span className="ml-auto text-xs text-muted">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">Goal</span>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setGoal(o.value)}
                  className={chip(goal === o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">Intensity</span>
            <div className="grid grid-cols-3 gap-2">
              {INTENSITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setIntensity(o.value)}
                  className={chip(intensity === o.value)}
                >
                  {o.label} ({o.lbPerWeek} lb)
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {numField(`Prev week avg (${unit})`, prevWeight, setPrevWeight)}
            {numField(`This week avg (${unit})`, thisWeight, setThisWeight)}
            {numField('Avg calories logged', avgCalories, setAvgCalories)}
            {numField('Days logged (0-7)', loggedDays, setLoggedDays)}
          </div>

          <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs">
            <span className="text-muted">Result status: </span>
            <span className="font-mono font-semibold text-foreground">
              {result.status}
            </span>
            {'weeklyChangeLb' in result && (
              <span className="ml-2 text-muted">
                (Δ {result.weeklyChangeLb} lb vs target {result.expectedChangeLb} lb)
              </span>
            )}
          </div>

          {resolved && (
            <p className="rounded-xl border border-primary/30 bg-accent/40 px-3 py-2 text-xs text-foreground">
              Simulated action: <strong>{resolved}</strong> (no data was changed)
            </p>
          )}

          {result.status === 'suggest' || result.status === 'not_followed' ? (
            <AdjustmentBanner
              result={result}
              profile={profile}
              simulate
              onResolved={(action) => setResolved(action)}
            />
          ) : (
            <p className="text-xs text-muted">
              This input produces no banner. Adjust the values above (e.g. make the
              weight trend miss the target while keeping calories near the goal) to
              trigger a suggestion.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function mkWeight(date: string, weightKg: number): WeightEntry {
  return {
    id: `sim-${date}`,
    user_id: 'sim',
    logged_date: date,
    weight_kg: weightKg,
    created_at: date,
    updated_at: date,
  }
}

const chip = (active: boolean) =>
  [
    'cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors duration-200',
    active
      ? 'border-primary bg-accent text-primary'
      : 'border-border bg-card text-muted hover:text-foreground',
  ].join(' ')

function numField(label: string, value: string, onChange: (v: string) => void) {
  return (
    <label className="block text-xs">
      <span className="font-medium text-muted">{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
      />
    </label>
  )
}
