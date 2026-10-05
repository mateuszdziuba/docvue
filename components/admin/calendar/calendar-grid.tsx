'use client'

import { addDays, format, isSameDay, isToday } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import type { CalendarAppointment } from '@/src/server/appointments'
import type { TimeBlock } from '@/src/server/time-blocks'
import type { StaffMember } from '@/types/database'
import type { AppointmentUpdateChanges } from './appointment-popover'
import { CalendarDayColumn } from './calendar-day-column'
import {
  END_HOUR,
  HOUR_HEIGHT,
  PIXELS_PER_MINUTE,
  START_HOUR,
  TIME_LABEL_WIDTH,
  TOTAL_GRID_HEIGHT,
} from './constants'

// ── Time gutter ──────────────────────────────────────────────────────────────

export function TimeGutter({ currentTimeTop }: { currentTimeTop: number | null }) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
  return (
    <div
      className="shrink-0 select-none relative"
      style={{ width: TIME_LABEL_WIDTH, minWidth: TIME_LABEL_WIDTH }}
    >
      <div className="h-[52px] border-b border-border/60" />
      {hours.map((hour) => (
        <div
          key={hour}
          className="relative border-t border-transparent"
          style={{ height: HOUR_HEIGHT }}
        >
          <span className="absolute -top-[17px] right-2 text-xs font-medium text-muted-foreground tabular-nums leading-none select-none">
            {String(hour).padStart(2, '0')}:00
          </span>
        </div>
      ))}
      {/* Etykieta końca siatki (np. 22:00) */}
      <div className="relative" style={{ height: 0 }}>
        <span className="absolute -top-[17px] right-2 text-xs font-medium text-muted-foreground tabular-nums leading-none select-none">
          {String(END_HOUR).padStart(2, '0')}:00
        </span>
      </div>
      {/* Current time label aligned with hour labels */}
      {currentTimeTop !== null && (
        <div
          className="absolute right-0 left-0 pointer-events-none z-30 flex items-center justify-end pr-1.5"
          style={{ top: `${52 + currentTimeTop}px` }}
        >
          <span className="text-[11px] tabular-nums text-destructive font-bold leading-none bg-background/90 px-0.5 rounded-sm -translate-y-[5px]">
            {format(new Date(), 'HH:mm')}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Background grid lines ─────────────────────────────────────────────────────

export function GridLines() {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
  return (
    <div className="absolute inset-0 pointer-events-none">
      {hours.map((hour, i) => (
        <div key={hour}>
          {/* Hour line — solid */}
          <div
            className="absolute left-0 right-0 border-t border-border/60"
            style={{ top: `${i * HOUR_HEIGHT}px` }}
          />
          {/* 15-min line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-border/60"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.25}px` }}
          />
          {/* 30-min line — slightly stronger */}
          <div
            className="absolute left-0 right-0 border-t border-border/60"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.5}px` }}
          />
          {/* 45-min line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-border/60"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.75}px` }}
          />
        </div>
      ))}
      <div
        className="absolute left-0 right-0 border-t border-border/60"
        style={{ top: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}
      />
    </div>
  )
}

// ── Main grid ────────────────────────────────────────────────────────────────

export interface PendingSelection {
  date: Date
  hour: number
  minute: number
  durationMinutes: number
}

interface CalendarGridProps {
  weekStart: Date
  days?: Date[]
  appointments: CalendarAppointment[]
  timeBlocks: TimeBlock[]
  snapMinutes: number
  isBlockMode: boolean
  dragGuideMinutes: number | null
  pendingSelection?: PendingSelection | null
  staffMembers?: Pick<StaffMember, 'id' | 'name'>[]
  onSlotSelect: (
    date: Date,
    hour: number,
    minute: number,
    durationMinutes: number | undefined,
    cursorX: number,
    cursorY: number,
  ) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CalendarAppointment['status']) => void
  onResizeBottomStart: (id: string, e: React.PointerEvent) => void
  onResizeTopStart: (id: string, e: React.PointerEvent) => void
  onDeleteTimeBlock: (id: string) => void
  onDrawGuide: (minutes: number | null) => void
  onUpdateAppointment?: (
    id: string,
    changes: AppointmentUpdateChanges,
  ) => Promise<{ error?: string | null }>
}

export function CalendarGrid({
  weekStart,
  days,
  appointments,
  timeBlocks,
  snapMinutes,
  isBlockMode,
  dragGuideMinutes,
  pendingSelection,
  staffMembers = [],
  onSlotSelect,
  onDelete,
  onStatusChange,
  onResizeBottomStart,
  onResizeTopStart,
  onDeleteTimeBlock,
  onDrawGuide,
  onUpdateAppointment,
}: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekDays = days ?? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      if (h < START_HOUR || h >= END_HOUR) {
        setCurrentTimeTop(null)
        return
      }
      setCurrentTimeTop((h * 60 + m - START_HOUR * 60) * PIXELS_PER_MINUTE)
    }
    update()
    const t = setInterval(update, 30_000)
    return () => clearInterval(t)
  }, [])

  const [hoverStates, setHoverStates] = useState<Array<{ hour: number; minute: number } | null>>(
    () => Array(weekDays.length).fill(null),
  )

  const setHoverSlot = (dayIdx: number, slot: { hour: number; minute: number } | null) => {
    setHoverStates((prev) => {
      const next = [...prev]
      next[dayIdx] = slot
      return next
    })
  }

  useEffect(() => {
    if (!scrollRef.current) return
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    const targetHour = h >= START_HOUR && h < END_HOUR ? h : 8
    const targetMin = h >= START_HOUR && h < END_HOUR ? m : 0
    const scrollY = Math.max(
      0,
      (targetHour * 60 + targetMin - START_HOUR * 60) * PIXELS_PER_MINUTE - 80,
    )
    scrollRef.current.scrollTop = scrollY
  }, [])

  return (
    <div className="relative flex flex-1 min-h-0 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div
          className="relative flex"
          style={{ minWidth: `${TIME_LABEL_WIDTH + weekDays.length * 100}px` }}
        >
          {/* Time gutter — przewija się w pionie razem z siatką, w poziomie przyklejona */}
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-border/60 bg-card"
            style={{ width: TIME_LABEL_WIDTH, minWidth: TIME_LABEL_WIDTH }}
          >
            <TimeGutter currentTimeTop={currentTimeTop} />
          </div>

          <div className="relative min-w-0 flex-1">
            {/* Cross-column alignment guide */}
            {dragGuideMinutes !== null && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-40"
                style={{ top: `${52 + dragGuideMinutes * PIXELS_PER_MINUTE}px` }}
              >
                <div className="flex items-center">
                  <div className="flex-1 border-t-2 border-dashed border-primary/60" />
                </div>
              </div>
            )}

            {/* Grid lines spanning ALL columns */}
            <div
              className="pointer-events-none absolute left-0 right-0 z-0"
              style={{ top: `${52}px`, height: `${TOTAL_GRID_HEIGHT}px` }}
            >
              <GridLines />
            </div>

            <div className="flex">
              {weekDays.map((day, dayIndex) => {
                const dayAppointments = appointments.filter((a) =>
                  isSameDay(new Date(a.start_time), day),
                )
                const dayBlocks = timeBlocks.filter((b) => {
                  const bStart = new Date(b.start_time)
                  const bEnd = new Date(b.end_time)
                  const dayStart = new Date(day)
                  dayStart.setHours(0, 0, 0, 0)
                  const dayEnd = new Date(day)
                  dayEnd.setHours(23, 59, 59, 999)
                  return bStart < dayEnd && bEnd > dayStart
                })

                return (
                  <div key={day.toISOString()} className="flex-1 relative">
                    <CalendarDayColumn
                      date={day}
                      dayIndex={dayIndex}
                      appointments={dayAppointments}
                      timeBlocks={dayBlocks}
                      snapMinutes={snapMinutes}
                      isBlockMode={isBlockMode}
                      currentTimeTop={isToday(day) ? currentTimeTop : null}
                      pendingSelection={
                        pendingSelection && isSameDay(day, pendingSelection.date)
                          ? pendingSelection
                          : null
                      }
                      staffMembers={staffMembers}
                      onSlotSelect={onSlotSelect}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      onResizeBottomStart={onResizeBottomStart}
                      onResizeTopStart={onResizeTopStart}
                      onDeleteTimeBlock={onDeleteTimeBlock}
                      onDrawGuide={onDrawGuide}
                      onUpdateAppointment={onUpdateAppointment}
                      hoverSlot={hoverStates[dayIndex]}
                      onHoverSlotChange={(slot) => setHoverSlot(dayIndex, slot)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card to-transparent md:hidden"
      />
    </div>
  )
}
