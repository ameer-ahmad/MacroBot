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
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => setCalendarOpen((open) => !open)}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-1 text-center transition-colors duration-200 hover:bg-accent"
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
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground"
        aria-label="Next day"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {!isToday && (
        <button
          type="button"
          onClick={() => {
            onChange(toDateString())
            setCalendarOpen(false)
          }}
          className="ml-1 min-h-11 shrink-0 cursor-pointer border-l border-border px-2 text-sm font-medium text-primary"
          aria-label="Jump to today"
        >
          Today
        </button>
      )}

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
