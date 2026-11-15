import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTrendData } from '@/hooks/useTrendData'
import { useProfile } from '@/hooks/useProfile'
import { fetchWeightEntries, queryKeys } from '@/lib/api'
import { kgToLb } from '@/lib/goals'
import { buildWeightSeries, CHART_COLORS, type TrendRange } from '@/lib/trends'

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: {Math.round(item.value * 10) / 10}
          {item.name === 'Calories' ? ' kcal' : 'g'}
        </p>
      ))}
    </div>
  )
}

function WeightTooltip({
  active,
  payload,
  label,
  unitLabel,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  unitLabel: string
}) {
  if (!active || !payload?.length || payload[0]?.value == null) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <p style={{ color: CHART_COLORS.weight }}>
        Weight: {Math.round(payload[0].value * 10) / 10} {unitLabel}
      </p>
    </div>
  )
}

export function TrendsSection() {
  const [range, setRange] = useState<TrendRange>(7)
  const { data: profile } = useProfile()
  const { series, summary, isLoading } = useTrendData(range)

  const imperial = profile?.units === 'imperial'
  const weightUnit = imperial ? 'lb' : 'kg'
  const { data: weightEntries = [] } = useQuery({
    queryKey: queryKeys.weightEntries,
    queryFn: () => fetchWeightEntries(),
    enabled: Boolean(profile),
  })
  const weightSeries = buildWeightSeries(weightEntries, range, (kg) =>
    imperial ? kgToLb(kg) : kg,
  )
  const hasWeight = weightSeries.some((p) => p.weight != null)

  const calorieGoal = profile?.calorie_goal ?? 2000

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Trends</h3>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {([7, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setRange(days)}
              className={[
                'cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors duration-200',
                range === days
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              {days === 7 ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted" aria-label="Loading trends" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border bg-background px-2 py-2.5">
              <p className="text-xs text-muted">Avg calories</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {summary.daysLogged ? summary.avgCalories : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background px-2 py-2.5">
              <p className="text-xs text-muted">Avg protein</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {summary.daysLogged ? `${summary.avgProtein}g` : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background px-2 py-2.5">
              <p className="text-xs text-muted">Days logged</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {summary.daysLogged}/{summary.totalDays}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted">Calories</p>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine
                    y={calorieGoal}
                    stroke={CHART_COLORS.calories}
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    name="Calories"
                    stroke={CHART_COLORS.calories}
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ r: 3, fill: CHART_COLORS.calories }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-center text-xs text-muted">
              Dashed line = daily calorie goal ({calorieGoal} kcal)
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted">Macros (grams)</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => (
                      <span className="text-muted">{value}</span>
                    )}
                  />
                  <Bar dataKey="protein_g" name="Protein" fill={CHART_COLORS.protein} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="carbs_g" name="Carbs" fill={CHART_COLORS.carbs} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="fats_g" name="Fats" fill={CHART_COLORS.fats} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="fiber_g" name="Fiber" fill={CHART_COLORS.fiber} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted">Weight ({weightUnit})</p>
            {hasWeight ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weightSeries}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={['dataMin - 1', 'dataMax + 1']}
                      tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<WeightTooltip unitLabel={weightUnit} />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      name="Weight"
                      stroke={CHART_COLORS.weight}
                      strokeWidth={2}
                      connectNulls
                      dot={{ r: 3, fill: CHART_COLORS.weight }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="rounded-xl border border-border bg-background px-3 py-6 text-center text-xs text-muted">
                Log your weight to see the trend here.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
