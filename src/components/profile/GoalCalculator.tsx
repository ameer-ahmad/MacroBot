import { useState } from 'react'
import {
  ACTIVITY_OPTIONS,
  DIET_OPTIONS,
  GOAL_OPTIONS,
  INTENSITY_OPTIONS,
  calcGoals,
  calcMaintenance,
  cmToIn,
  inToCm,
  kgToLb,
  lbToKg,
  type ActivityLevel,
  type CalcInputs,
  type DietType,
  type GoalDirection,
  type GoalSet,
  type Intensity,
  type Sex,
} from '@/lib/goals'
import type { UnitSystem } from '@/types/database'

const inputClass =
  'w-full rounded-xl border border-border bg-card px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const chip = (active: boolean) =>
  [
    'cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition-colors duration-200',
    active
      ? 'border-primary bg-accent text-primary'
      : 'border-border bg-card text-muted hover:text-foreground',
  ].join(' ')

export function GoalCalculator({
  units,
  initial,
  applyLabel,
  busy,
  onApply,
}: {
  units: UnitSystem
  initial?: Partial<CalcInputs>
  applyLabel: string
  busy?: boolean
  onApply: (goals: GoalSet, inputs: CalcInputs) => void
}) {
  const imperial = units === 'imperial'

  const [sex, setSex] = useState<Sex | ''>(initial?.sex ?? '')
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '')
  const [height, setHeight] = useState(
    initial?.heightCm
      ? String(Math.round(imperial ? cmToIn(initial.heightCm) : initial.heightCm))
      : '',
  )
  const [weight, setWeight] = useState(
    initial?.weightKg
      ? String(Math.round(imperial ? kgToLb(initial.weightKg) : initial.weightKg))
      : '',
  )
  const [activity, setActivity] = useState<ActivityLevel | ''>(initial?.activity ?? '')
  const [diet, setDiet] = useState<DietType | ''>(initial?.diet ?? '')
  const [goal, setGoal] = useState<GoalDirection | ''>(initial?.goal ?? '')
  const [intensity, setIntensity] = useState<Intensity | ''>(initial?.intensity ?? '')

  const heightCm = height ? (imperial ? inToCm(Number(height)) : Number(height)) : 0
  const weightKg = weight ? (imperial ? lbToKg(Number(weight)) : Number(weight)) : 0

  const needsIntensity = goal === 'lose' || goal === 'gain'

  const valid =
    sex !== '' &&
    Number(age) > 0 &&
    heightCm > 0 &&
    weightKg > 0 &&
    activity !== '' &&
    diet !== '' &&
    goal !== '' &&
    (!needsIntensity || intensity !== '')

  const inputs: CalcInputs | null = valid
    ? {
        sex,
        age: Number(age),
        heightCm,
        weightKg,
        activity,
        diet,
        goal,
        intensity: intensity || 'moderate',
      }
    : null
  const goals = inputs ? calcGoals(inputs) : null
  const maintenance = inputs ? calcMaintenance(inputs) : null

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">Sex</span>
        <div className="grid grid-cols-2 gap-2">
          {(['male', 'female'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSex(option)}
              className={`${chip(sex === option)} capitalize`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="block text-sm">
          <span className="font-medium text-foreground">Age</span>
          <input
            type="number"
            min="1"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-foreground">
            Height ({imperial ? 'in' : 'cm'})
          </span>
          <input
            type="number"
            min="1"
            step="any"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-foreground">
            Weight ({imperial ? 'lb' : 'kg'})
          </span>
          <input
            type="number"
            min="1"
            step="any"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Activity level
        </span>
        <div className="space-y-2">
          {ACTIVITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActivity(option.value)}
              className={[
                'w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors duration-200',
                activity === option.value
                  ? 'border-primary bg-accent'
                  : 'border-border bg-card hover:border-primary/50',
              ].join(' ')}
            >
              <span className="block text-sm font-medium text-foreground">
                {option.label}
              </span>
              <span className="block text-xs text-muted">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">Goal</span>
        <div className="grid grid-cols-3 gap-2">
          {GOAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGoal(option.value)}
              className={chip(goal === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {needsIntensity && (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Pace
          </span>
          <div className="grid grid-cols-3 gap-2">
            {INTENSITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setIntensity(option.value)}
                className={chip(intensity === option.value)}
              >
                <span className="block">{option.label}</span>
                <span className="mt-0.5 block text-[10px] text-muted">
                  {goal === 'lose' ? '−' : '+'}
                  {option.delta} kcal
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Carb preference
        </span>
        <div className="grid grid-cols-3 gap-2">
          {DIET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDiet(option.value)}
              className={chip(diet === option.value)}
            >
              <span className="block">{option.label}</span>
              <span className="mt-0.5 block text-[10px] text-muted">
                {option.protein}/{option.carbs}/{option.fats}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">Split is protein / carbs / fats.</p>
      </div>

      {goals && (
        <div className="rounded-xl border border-primary/30 bg-accent/50 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            {goals.calorie_goal.toLocaleString()} kcal / day
          </p>
          {maintenance !== null && maintenance !== goals.calorie_goal && (
            <p className="mt-0.5 text-xs text-muted">
              Maintenance ~{maintenance.toLocaleString()} kcal
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            Protein {goals.protein_goal}g · Carbs {goals.carbs_goal}g · Fats{' '}
            {goals.fats_goal}g · Fiber {goals.fiber_goal}g
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!valid || busy}
        onClick={() => inputs && goals && onApply(goals, inputs)}
        className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? 'Saving…' : applyLabel}
      </button>
    </div>
  )
}
