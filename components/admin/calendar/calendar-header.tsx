'use client'

import { addWeeks, subWeeks, format, endOfWeek, startOfWeek, isSameMonth, isSameYear } from 'date-fns'
import { pl } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

interface CalendarHeaderProps {
  weekStart: Date
  isLoading: boolean
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
}

export function CalendarHeader({ weekStart, isLoading, onNavigate }: CalendarHeaderProps) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

  const formatWeekRange = () => {
    if (isSameMonth(weekStart, weekEnd)) {
      return `${format(weekStart, 'd')}–${format(weekEnd, 'd MMMM yyyy', { locale: pl })}`
    }
    if (isSameYear(weekStart, weekEnd)) {
      return `${format(weekStart, 'd MMMM', { locale: pl })} – ${format(weekEnd, 'd MMMM yyyy', { locale: pl })}`
    }
    return `${format(weekStart, 'd MMMM yyyy', { locale: pl })} – ${format(weekEnd, 'd MMMM yyyy', { locale: pl })}`
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('today')}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
        >
          Dziś
        </button>
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => onNavigate('prev')}
            className="p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Poprzedni tydzień"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border-l border-border"
            aria-label="Następny tydzień"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isLoading && (
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        )}
        <span className="text-sm font-semibold text-foreground capitalize">
          {formatWeekRange()}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground hidden sm:inline">Widok tygodniowy</span>
      </div>
    </div>
  )
}
