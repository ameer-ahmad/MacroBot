import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDisplayDate, shiftDate, toDateString } from '@/lib/macros'

export function DateNavigator({
  date,
  onChange,
}: {
  date: string
  onChange: (date: string) => void
}) {
  const isToday = date === toDateString()

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-2 py-1.5 shadow-sm">
      <button
        type="button"
        onClick={() => onChange(shiftDate(date, -1))}
        className="cursor-pointer rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="text-center">
        <p className="font-semibold text-foreground">{formatDisplayDate(date)}</p>
        <p className="text-xs text-muted">
          {parseDisplayDate(date)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(shiftDate(date, 1))}
        disabled={isToday}
        className="cursor-pointer rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Next day"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}

function parseDisplayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TodayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-sm font-medium text-primary transition-colors duration-200 hover:opacity-80"
    >
      Jump to today
    </button>
  )
}
