'use client'

import { endOfWeek, format, isSameMonth, isSameYear } from 'date-fns'
import { pl } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'

const SNAP_OPTIONS = [5, 10, 15, 30, 60] as const

export type ViewType = 'day' | 'week' | 'month'

interface CalendarHeaderProps {
  weekStart: Date
  selectedDay: Date
  monthStart: Date
  view: ViewType
  isLoading: boolean
  snapMinutes: number
  isBlockMode: boolean
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
  onSnapChange: (minutes: number) => void
  onBlockModeChange: (active: boolean) => void
  onViewChange: (view: ViewType) => void
}

export function CalendarHeader({
  weekStart,
  selectedDay,
  monthStart,
  view,
  isLoading,
  snapMinutes,
  isBlockMode,
  onNavigate,
  onSnapChange,
  onBlockModeChange,
  onViewChange,
}: CalendarHeaderProps) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

  const formatLabel = () => {
    if (view === 'day') {
      return format(selectedDay, 'EEEE, d MMMM yyyy', { locale: pl })
    }
    if (view === 'month') {
      return format(monthStart, 'LLLL yyyy', { locale: pl })
    }
    if (isSameMonth(weekStart, weekEnd)) {
      return `${format(weekStart, 'd')}–${format(weekEnd, 'd MMMM yyyy', { locale: pl })}`
    }
    if (isSameYear(weekStart, weekEnd)) {
      return `${format(weekStart, 'd MMMM', { locale: pl })} – ${format(weekEnd, 'd MMMM yyyy', { locale: pl })}`
    }
    return `${format(weekStart, 'd MMMM yyyy', { locale: pl })} – ${format(weekEnd, 'd MMMM yyyy', { locale: pl })}`
  }

  const prevLabel =
    view === 'day' ? 'Poprzedni dzień' : view === 'month' ? 'Poprzedni miesiąc' : 'Poprzedni tydzień'
  const nextLabel =
    view === 'day' ? 'Następny dzień' : view === 'month' ? 'Następny miesiąc' : 'Następny tydzień'

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-card shrink-0 flex-wrap">
      {/* Left: nav + view switcher */}
      <div className="flex items-center gap-2 flex-wrap">
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
            aria-label={prevLabel}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border-l border-border"
            aria-label={nextLabel}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View switcher */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          {(['day', 'week', 'month'] as const).map((v, i) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                i > 0 ? 'border-l border-border' : ''
              } ${
                view === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {v === 'day' ? 'Dzień' : v === 'week' ? 'Tydzień' : 'Miesiąc'}
            </button>
          ))}
        </div>
      </div>

      {/* Center: period label */}
      <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
        {isLoading && (
          <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
        )}
        <span className="text-sm font-semibold text-foreground capitalize truncate">
          {formatLabel()}
        </span>
      </div>

      {/* Right: snap picker + block mode (hidden in month view) */}
      {view !== 'month' && (
        <div className="flex items-center gap-3 shrink-0">
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
      )}
    </div>
  )
}
