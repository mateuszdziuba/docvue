'use client'

import { endOfWeek, format, isSameMonth, isSameYear } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CalendarPlus, ChevronLeft, ChevronRight, Lock, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { StaffMember } from '@/types/database'
import { staffColor, staffInitials } from './staff-colors'

const SNAP_OPTIONS = [5, 10, 15, 30, 60] as const

export type ViewType = 'day' | 'week' | 'month'

interface StaffFilterProps {
  staff: Pick<StaffMember, 'id' | 'name'>[]
  value: string
  onChange: (staffId: string) => void
}

export function StaffFilter({ staff, value, onChange }: StaffFilterProps) {
  if (staff.length === 0) return null

  return (
    <fieldset className="flex items-center gap-1.5 flex-wrap border-0 p-0 m-0 min-w-0">
      <legend className="sr-only">Filtruj po pracowniku</legend>
      <button
        type="button"
        onClick={() => onChange('all')}
        aria-pressed={value === 'all'}
        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors min-h-[28px] ${
          value === 'all'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
        }`}
      >
        Wszyscy
      </button>
      {staff.map((member) => {
        const color = staffColor(member.id)
        const selected = value === member.id
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onChange(selected ? 'all' : member.id)}
            aria-pressed={selected}
            className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-md text-xs font-medium border transition-colors min-h-[28px] ${
              selected
                ? `border-transparent ring-2 ${color.ringClass} ${color.containerClass}`
                : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${color.containerClass} border ${color.borderClass}`}
              aria-hidden="true"
            >
              {staffInitials(member.name)}
            </span>
            <span className="max-w-[120px] truncate">{member.name}</span>
          </button>
        )
      })}
    </fieldset>
  )
}

export function StaffLegend({ staff }: { staff: Pick<StaffMember, 'id' | 'name'>[] }) {
  if (staff.length === 0) return null
  return (
    <div className="flex items-center gap-3 flex-wrap px-4 py-1.5 border-b border-border/60 bg-card shrink-0">
      <span className="text-xs font-medium text-muted-foreground">Pracownicy:</span>
      {staff.map((member) => (
        <span key={member.id} className="flex items-center gap-1.5 text-xs text-foreground">
          <span
            className={`w-2.5 h-2.5 rounded-full ${staffColor(member.id).solidClass}`}
            aria-hidden="true"
          />
          {member.name}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
        Nieprzypisane
      </span>
    </div>
  )
}

const VIEW_LABELS: Record<ViewType, string> = {
  day: 'Dzień',
  week: 'Tydzień',
  month: 'Miesiąc',
}

interface ViewSwitcherProps {
  view: ViewType
  compact?: boolean
  onViewChange: (view: ViewType) => void
}

function ViewSwitcher({ view, compact = false, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0">
      {(['day', 'week', 'month'] as const).map((v, i) => (
        <Button
          key={v}
          type="button"
          variant={view === v ? 'default' : 'ghost'}
          onClick={() => onViewChange(v)}
          aria-pressed={view === v}
          className={`rounded-none text-xs font-medium px-2.5 ${
            compact ? 'min-h-11 px-2' : 'min-h-8'
          } ${i > 0 ? 'border-l border-border' : ''} ${view === v ? '' : 'text-muted-foreground'}`}
        >
          {VIEW_LABELS[v]}
        </Button>
      ))}
    </div>
  )
}

interface CalendarHeaderProps {
  weekStart: Date
  selectedDay: Date
  monthStart: Date
  view: ViewType
  isLoading: boolean
  snapMinutes: number
  isBlockMode: boolean
  staff?: Pick<StaffMember, 'id' | 'name'>[]
  staffFilter?: string
  onStaffFilterChange?: (staffId: string) => void
  onNewAppointment?: () => void
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
  staff = [],
  staffFilter = 'all',
  onStaffFilterChange,
  onNewAppointment,
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
    view === 'day'
      ? 'Poprzedni dzień'
      : view === 'month'
        ? 'Poprzedni miesiąc'
        : 'Poprzedni tydzień'
  const nextLabel =
    view === 'day' ? 'Następny dzień' : view === 'month' ? 'Następny miesiąc' : 'Następny tydzień'

  const label = formatLabel()
  const mobileLabel =
    view === 'day'
      ? format(selectedDay, 'EEE, d MMM', { locale: pl })
      : view === 'month'
        ? format(monthStart, 'LLLL yyyy', { locale: pl })
        : `${format(weekStart, 'd MMM', { locale: pl })} – ${format(weekEnd, 'd MMM', { locale: pl })}`

  return (
    <div className="flex flex-col px-4 py-2.5 border-b border-border/60 bg-card shrink-0">
      {/* Desktop layout */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate('today')}
            className="px-3 text-sm font-medium rounded-lg min-h-8"
          >
            Dziś
          </Button>

          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('prev')}
              className="rounded-none text-muted-foreground hover:bg-secondary hover:text-foreground min-w-8 min-h-8"
              aria-label={prevLabel}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('next')}
              className="rounded-none text-muted-foreground hover:bg-secondary hover:text-foreground border-l border-border min-w-8 min-h-8"
              aria-label={nextLabel}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <ViewSwitcher view={view} onViewChange={onViewChange} />

          {onNewAppointment && (
            <Button
              type="button"
              onClick={onNewAppointment}
              className="gap-1.5 px-3 text-xs font-semibold rounded-lg min-h-8"
            >
              <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
              Nowa wizyta
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
          {isLoading && (
            <div
              className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0"
              aria-hidden="true"
            />
          )}
          <span className="text-sm font-semibold text-foreground capitalize truncate">{label}</span>
        </div>

        {view !== 'month' && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Siatka</span>
              <div className="flex items-center rounded-lg border border-border overflow-hidden">
                {SNAP_OPTIONS.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={snapMinutes === s ? 'default' : 'ghost'}
                    onClick={() => onSnapChange(s)}
                    aria-pressed={snapMinutes === s}
                    className={`rounded-none px-2 text-xs font-medium tabular-nums min-h-7 ${
                      SNAP_OPTIONS.indexOf(s) > 0 ? 'border-l border-border' : ''
                    } ${snapMinutes === s ? '' : 'text-muted-foreground'}`}
                  >
                    {s}'
                  </Button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => onBlockModeChange(!isBlockMode)}
              aria-pressed={isBlockMode}
              className={`gap-1.5 px-3 text-xs font-medium rounded-lg min-h-8 ${
                isBlockMode
                  ? 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15 hover:text-destructive'
                  : 'text-muted-foreground'
              }`}
              title={isBlockMode ? 'Wyłącz tryb blokady' : 'Zarezerwuj czas'}
            >
              <Lock className="w-3 h-3" aria-hidden="true" />
              {isBlockMode ? 'Tryb blokady' : 'Zarezerwuj'}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile layout — max two rows */}
      <div className="flex flex-col gap-2.5 md:hidden">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate('today')}
            className="px-3 text-sm font-medium rounded-lg min-h-11 shrink-0"
          >
            Dziś
          </Button>

          <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('prev')}
              className="rounded-none text-muted-foreground hover:bg-secondary hover:text-foreground min-w-11 min-h-11"
              aria-label={prevLabel}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('next')}
              className="rounded-none text-muted-foreground hover:bg-secondary hover:text-foreground border-l border-border min-w-11 min-h-11"
              aria-label={nextLabel}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
            {isLoading && (
              <div
                className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0"
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 truncate text-right text-[13px] font-semibold capitalize text-foreground">
              {mobileLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ViewSwitcher view={view} compact onViewChange={onViewChange} />

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {onNewAppointment && (
              <Button
                type="button"
                size="icon"
                onClick={onNewAppointment}
                aria-label="Nowa wizyta"
                title="Nowa wizyta"
                className="rounded-lg min-h-11 min-w-11"
              >
                <CalendarPlus className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Więcej opcji"
                  title="Więcej opcji"
                  className="rounded-lg min-h-11 min-w-11"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {view !== 'month' && (
                  <>
                    <DropdownMenuLabel>Siatka</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={String(snapMinutes)}
                      onValueChange={(value) => onSnapChange(Number(value))}
                    >
                      {SNAP_OPTIONS.map((s) => (
                        <DropdownMenuRadioItem
                          key={s}
                          value={String(s)}
                          className="min-h-11 md:min-h-8"
                        >
                          {s} min
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={isBlockMode}
                      onCheckedChange={(checked) => onBlockModeChange(Boolean(checked))}
                      className="min-h-11 md:min-h-8"
                    >
                      <Lock className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                      Tryb blokady
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {staff.length > 0 && onStaffFilterChange && (
                  <>
                    <DropdownMenuLabel>Pracownik</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={staffFilter} onValueChange={onStaffFilterChange}>
                      <DropdownMenuRadioItem value="all" className="min-h-11 md:min-h-8">
                        Wszyscy
                      </DropdownMenuRadioItem>
                      {staff.map((member) => (
                        <DropdownMenuRadioItem
                          key={member.id}
                          value={member.id}
                          className="min-h-11 md:min-h-8"
                        >
                          {member.name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {staff.length > 0 && onStaffFilterChange && (
        <div className="hidden md:block mt-2">
          <StaffFilter staff={staff} value={staffFilter} onChange={onStaffFilterChange} />
        </div>
      )}
    </div>
  )
}
