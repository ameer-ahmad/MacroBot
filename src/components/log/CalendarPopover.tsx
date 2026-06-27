import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { parseDateString, toDateString } from '@/lib/macros'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function CalendarPopover({
  selected,
  onSelect,
  onClose,
  maxDate = toDateString(),
}: {
  selected: string
  onSelect: (date: string) => void
  onClose: () => void
  maxDate?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedDate = parseDateString(selected)
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const firstDay = startOfMonth(viewYear, viewMonth).getDay()
  const totalDays = daysInMonth(viewYear, viewMonth)
  const today = toDateString()

  const cells: (string | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let day = 1; day <= totalDays; day++) {
    cells.push(toDateString(new Date(viewYear, viewMonth, day)))
  }

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-border bg-card p-3 shadow-xl"
      role="dialog"
      aria-label="Choose date"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={goToNextMonth}
          className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors duration-200 hover:bg-accent hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, i) => (
          <div key={i} className="py-1 text-center text-xs font-medium text-muted">
            {day}
          </div>
        ))}

        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} />

          const isSelected = dateStr === selected
          const isToday = dateStr === today
          const isDisabled = dateStr > maxDate

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                onSelect(dateStr)
                onClose()
              }}
              className={[
                'flex h-9 cursor-pointer items-center justify-center rounded-lg text-sm transition-colors duration-200',
                isSelected
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : isToday
                    ? 'border border-primary text-primary hover:bg-accent'
                    : 'text-foreground hover:bg-accent',
                isDisabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {Number(dateStr.slice(-2))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
