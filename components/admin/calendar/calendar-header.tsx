'use client'

import { endOfWeek, format, isSameMonth, isSameYear } from 'date-fns'
import { pl } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'

const SNAP_OPTIONS = [5, 10, 15, 30, 60] as const

interface CalendarHeaderProps {
  weekStart: Date
  isLoading: boolean
  snapMinutes: number
  isBlockMode: boolean
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
  onSnapChange: (minutes: number) => void
  onBlockModeChange: (active: boolean) => void
}

export function CalendarHeader({
  weekStart,
  isLoading,
  snapMinutes,
  isBlockMode,
  onNavigate,
  onSnapChange,
  onBlockModeChange,
}: CalendarHeaderProps) {
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
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-card shrink-0 flex-wrap">
      {/* Left: nav controls */}
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

      {/* Center: week label */}
      <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
        {isLoading && (
          <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
        )}
        <span className="text-sm font-semibold text-foreground capitalize truncate">
          {formatWeekRange()}
        </span>
      </div>

      {/* Right: snap picker + block mode */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Snap grid picker */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Siatka</span>
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            {SNAP_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSnapChange(s)}
                className={`px-2 py-1 text-[11px] font-medium transition-colors border-l border-border first:border-l-0 ${
                  snapMinutes === s
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {s}'
              </button>
            ))}
          </div>
        </div>

        {/* Block mode toggle */}
        <button
          onClick={() => onBlockModeChange(!isBlockMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            isBlockMode
              ? 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15'
              : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title={isBlockMode ? 'Wyłącz tryb blokady' : 'Zarezerwuj czas'}
        >
          <Lock className="w-3 h-3" />
          {isBlockMode ? 'Tryb blokady' : 'Zarezerwuj'}
        </button>
      </div>
    </div>
  )
}
