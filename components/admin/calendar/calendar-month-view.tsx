'use client'

import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { APPOINTMENT_STATUS_CONFIG, type AppointmentStatus } from '@/components/admin/status-badge'
import type { CalendarAppointment } from '@/src/server/appointments'
import type { StaffMember } from '@/types/database'
import { AppointmentPopover, type AppointmentUpdateChanges } from './appointment-popover'

const STATUS_CHIP: Record<AppointmentStatus, string> = {
  scheduled: 'bg-info-container text-on-info-container border-info/30',
  pending_forms: 'bg-warning-container text-on-warning-container border-warning/40',
  completed: 'bg-success-container text-on-success-container border-success/35',
  cancelled: 'bg-muted text-muted-foreground border-border',
}

const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie']

interface CalendarMonthViewProps {
  monthStart: Date
  appointments: CalendarAppointment[]
  onDayClick: (day: Date) => void
  staffMembers?: Pick<StaffMember, 'id' | 'name'>[]
  onUpdateAppointment?: (
    id: string,
    changes: AppointmentUpdateChanges,
  ) => Promise<{ error?: string | null }>
  onStatusChange?: (id: string, status: CalendarAppointment['status']) => void
}

export function CalendarMonthView({
  monthStart,
  appointments,
  onDayClick,
  staffMembers = [],
  onUpdateAppointment,
  onStatusChange,
}: CalendarMonthViewProps) {
  const [popoverApt, setPopoverApt] = useState<string | null>(null)

  const monthGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 })
    const days: Date[] = []
    let cursor = start
    while (cursor <= end) {
      days.push(cursor)
      cursor = addDays(cursor, 1)
    }
    return days
  }, [monthStart])

  const aptsByDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>()
    for (const apt of appointments) {
      const key = format(parseISO(apt.start_time), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(apt)
    }
    return map
  }, [appointments])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day name header row */}
      <div className="grid grid-cols-7 border-b border-border/60 bg-card shrink-0">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-2.5 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 [grid-auto-rows:minmax(76px,1fr)] md:[grid-auto-rows:minmax(110px,1fr)]">
          {monthGrid.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayApts = aptsByDay.get(key) ?? []
            const inMonth = isSameMonth(day, monthStart)
            const today = isToday(day)
            const dayLabel = format(day, 'EEEE, d MMMM yyyy', { locale: pl })

            return (
              // biome-ignore lint/a11y/useSemanticElements: day cell contains its own focusable buttons (day number, chips)
              <div
                key={key}
                role="button"
                tabIndex={0}
                aria-label={`Otwórz widok dnia: ${dayLabel}`}
                className={`border-r border-b border-border/40 p-1 md:p-1.5 flex flex-col cursor-pointer hover:bg-secondary/30 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  !inMonth ? 'opacity-40' : ''
                }`}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onDayClick(day)
                  }
                }}
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest('[data-apt-chip]')) return
                  onDayClick(day)
                }}
              >
                {/* Date number — keyboard route to the day view */}
                <div className="flex items-center justify-between mb-1">
                  <button
                    type="button"
                    data-day-number
                    aria-label={`Otwórz widok dnia ${dayLabel}`}
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      today
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-primary hover:text-primary-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDayClick(day)
                    }}
                    title={dayLabel}
                  >
                    {format(day, 'd')}
                  </button>
                </div>

                {/* Appointment chips */}
                <div className="flex flex-col gap-0.5 flex-1 min-h-0">
                  {dayApts.slice(0, 3).map((apt, chipIndex) => {
                    const chipConfig = APPOINTMENT_STATUS_CONFIG[apt.status]
                    const ChipIcon = chipConfig.icon
                    return (
                      <AppointmentPopover
                        key={apt.id}
                        appointment={apt}
                        open={popoverApt === apt.id}
                        onOpenChange={(o) => setPopoverApt(o ? apt.id : null)}
                        staffMembers={staffMembers}
                        onUpdate={onUpdateAppointment}
                        onStatusChange={onStatusChange}
                      >
                        <button
                          type="button"
                          data-apt-chip
                          aria-label={`${format(parseISO(apt.start_time), 'HH:mm')} ${apt.client.name}, ${chipConfig.label}${
                            apt.staff_member ? `, ${apt.staff_member.name}` : ''
                          }`}
                          className={`w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-left text-[10px] font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex md:text-[11px] ${
                            chipIndex === 2 ? 'hidden' : 'flex'
                          } ${STATUS_CHIP[apt.status]}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setPopoverApt(popoverApt === apt.id ? null : apt.id)
                          }}
                        >
                          <ChipIcon className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                          <span
                            className={`truncate ${apt.status === 'cancelled' ? 'line-through' : ''}`}
                          >
                            {format(parseISO(apt.start_time), 'HH:mm')} {apt.client.name}
                          </span>
                        </button>
                      </AppointmentPopover>
                    )
                  })}
                  {dayApts.length > 2 && (
                    <button
                      type="button"
                      data-apt-chip
                      aria-label={`Pokaż wszystkie wizyty: ${dayLabel} (${dayApts.length})`}
                      className="flex min-h-6 items-center rounded px-1.5 text-left text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDayClick(day)
                      }}
                    >
                      +{dayApts.length - 2} więcej
                    </button>
                  )}
                  {dayApts.length > 3 && (
                    <button
                      type="button"
                      data-apt-chip
                      aria-label={`Pokaż wszystkie wizyty: ${dayLabel} (${dayApts.length})`}
                      className="hidden min-h-0 items-center px-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDayClick(day)
                      }}
                    >
                      +{dayApts.length - 3} więcej
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
