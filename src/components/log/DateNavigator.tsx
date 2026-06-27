import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDisplayDate, shiftDate, toDateString } from '@/lib/macros'
import { CalendarPopover } from '@/components/log/CalendarPopover'

export function DateNavigator({
  date,
  onChange,
}: {
  date: string
  onChange: (date: string) => void
}) {
  const isToday = date === toDateString()
  const [calendarOpen, setCalendarOpen] = useState(false)

  return (
    <div className="relative flex items-center justify-between rounded-xl border border-border bg-card px-2 py-1.5 shadow-sm">
      <button
        type="button"
        onClick={() => onChange(shiftDate(date, -1))}
        className="cursor-pointer rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => setCalendarOpen((open) => !open)}
        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1 text-center transition-colors duration-200 hover:bg-accent"
        aria-haspopup="dialog"
        aria-expanded={calendarOpen}
        aria-label="Open calendar to choose a date"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <span>
          <span className="block font-semibold text-foreground">{formatDisplayDate(date)}</span>
          <span className="block text-xs text-muted">{parseDisplayDate(date)}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChange(shiftDate(date, 1))}
        disabled={isToday}
        className="cursor-pointer rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Next day"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {calendarOpen && (
        <CalendarPopover
          selected={date}
          onSelect={onChange}
          onClose={() => setCalendarOpen(false)}
        />
      )}
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
