'use client'

import { useMemo, useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  format,
  parseISO,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import type { CalendarAppointment } from '@/actions/appointments'
import { AppointmentPopover } from './appointment-popover'

const STATUS_CHIP: Record<CalendarAppointment['status'], string> = {
  scheduled: 'bg-primary/15 text-primary',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-muted text-muted-foreground line-through',
  pending_forms: 'bg-accent/20 text-accent-foreground',
}

const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie']

interface CalendarMonthViewProps {
  monthStart: Date
  appointments: CalendarAppointment[]
  onDayClick: (day: Date) => void
  onSlotSelect: (
    date: Date,
    hour: number,
    minute: number,
    durationMinutes: number | undefined,
    cursorX: number,
    cursorY: number,
  ) => void
}

export function CalendarMonthView({
  monthStart,
  appointments,
  onDayClick,
  onSlotSelect,
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
      map.get(key)!.push(apt)
    }
    return map
  }, [appointments])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day name header row */}
      <div className="grid grid-cols-7 border-b border-border/40 bg-card shrink-0">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="grid grid-cols-7"
          style={{ gridAutoRows: 'minmax(110px, 1fr)' }}
        >
          {monthGrid.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayApts = aptsByDay.get(key) ?? []
            const inMonth = isSameMonth(day, monthStart)
            const today = isToday(day)

            return (
              <div
                key={key}
                className={`border-r border-b border-border/30 p-1.5 flex flex-col cursor-pointer hover:bg-secondary/30 transition-colors group ${
                  !inMonth ? 'opacity-40' : ''
                }`}
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest('[data-apt-chip]') || target.closest('[data-day-number]')) return
                  onSlotSelect(day, 9, 0, undefined, e.clientX, e.clientY)
                }}
              >
                {/* Date number */}
                <div className="flex items-center justify-between mb-1">
                  <button
                    data-day-number
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold transition-colors shrink-0 ${
                      today
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-primary hover:text-primary-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDayClick(day)
                    }}
                    title={format(day, 'EEEE, d MMMM yyyy', { locale: pl })}
                  >
                    {format(day, 'd')}
                  </button>
                </div>

                {/* Appointment chips */}
                <div className="flex flex-col gap-0.5 flex-1 min-h-0">
                  {dayApts.slice(0, 3).map((apt) => (
                    <AppointmentPopover
                      key={apt.id}
                      appointment={apt}
                      open={popoverApt === apt.id}
                      onOpenChange={(o) => setPopoverApt(o ? apt.id : null)}
                    >
                      <button
                        data-apt-chip
                        className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate transition-opacity hover:opacity-80 ${STATUS_CHIP[apt.status]}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPopoverApt(popoverApt === apt.id ? null : apt.id)
                        }}
                      >
                        {format(parseISO(apt.start_time), 'HH:mm')} {apt.client.name}
                      </button>
                    </AppointmentPopover>
                  ))}
                  {dayApts.length > 3 && (
                    <button
                      data-apt-chip
                      className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 text-left transition-colors"
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
