'use client'

import { useEffect, useRef, useState } from 'react'
import { addDays, isSameDay, format } from 'date-fns'
import { CalendarDayColumn } from './calendar-day-column'
import {
  HOUR_HEIGHT,
  START_HOUR,
  END_HOUR,
  TOTAL_GRID_HEIGHT,
  TIME_LABEL_WIDTH,
  PIXELS_PER_MINUTE,
} from './constants'
import type { CalendarAppointment } from '@/actions/appointments'

// ── Current time indicator ───────────────────────────────────────────────────

function CurrentTimeLine() {
  const [top, setTop] = useState<number | null>(null)
  const [timeLabel, setTimeLabel] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      if (h < START_HOUR || h >= END_HOUR) {
        setTop(null)
        return
      }
      const mins = h * 60 + m - START_HOUR * 60
      setTop(mins * PIXELS_PER_MINUTE)
      setTimeLabel(format(now, 'HH:mm'))
    }
    update()
    const t = setInterval(update, 30_000)
    return () => clearInterval(t)
  }, [])

  if (top === null) return null

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="flex items-center">
        <span className="text-[9px] tabular-nums text-destructive font-semibold bg-background pr-1 leading-none">
          {timeLabel}
        </span>
        <div className="w-2 h-2 rounded-full bg-destructive shrink-0 -ml-1" />
        <div className="flex-1 h-px bg-destructive" />
      </div>
    </div>
  )
}

// ── Time gutter ──────────────────────────────────────────────────────────────

function TimeGutter() {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
  return (
    <div
      className="shrink-0 select-none"
      style={{ width: TIME_LABEL_WIDTH, minWidth: TIME_LABEL_WIDTH }}
    >
      {/* Spacer matching day-header height */}
      <div className="h-[52px] border-b border-border/50" />
      {/* Hour rows */}
      {hours.map((hour) => (
        <div
          key={hour}
          className="relative border-t border-transparent"
          style={{ height: HOUR_HEIGHT }}
        >
          <span className="absolute -top-[9px] right-2 text-[10px] font-medium text-muted-foreground/60 tabular-nums leading-none select-none">
            {String(hour).padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Background grid lines ─────────────────────────────────────────────────────

function GridLines() {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
  return (
    <div className="absolute inset-0 pointer-events-none">
      {hours.map((_, i) => (
        <div key={i}>
          {/* Hour line — solid, medium */}
          <div
            className="absolute left-0 right-0 border-t border-border/50"
            style={{ top: `${i * HOUR_HEIGHT}px` }}
          />
          {/* 15-min mark */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-border/20"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.25}px` }}
          />
          {/* 30-min mark — slightly more visible */}
          <div
            className="absolute left-0 right-0 border-t border-border/30"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.5}px` }}
          />
          {/* 45-min mark */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-border/20"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.75}px` }}
          />
        </div>
      ))}
      {/* Bottom boundary */}
      <div
        className="absolute left-0 right-0 border-t border-border/50"
        style={{ top: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}
      />
    </div>
  )
}

// ── Main grid ────────────────────────────────────────────────────────────────

interface CalendarGridProps {
  weekStart: Date
  appointments: CalendarAppointment[]
  onSlotClick: (date: Date, hour: number, minute: number) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CalendarAppointment['status']) => void
  onResizeBottomStart: (id: string, e: React.PointerEvent) => void
  onResizeTopStart: (id: string, e: React.PointerEvent) => void
}

export function CalendarGrid({
  weekStart,
  appointments,
  onSlotClick,
  onDelete,
  onStatusChange,
  onResizeBottomStart,
  onResizeTopStart,
}: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Per-column hover slot state
  const [hoverStates, setHoverStates] = useState<Array<{ hour: number; minute: number } | null>>(
    () => Array(7).fill(null),
  )

  const setHoverSlot = (dayIdx: number, slot: { hour: number; minute: number } | null) => {
    setHoverStates((prev) => {
      const next = [...prev]
      next[dayIdx] = slot
      return next
    })
  }

  // Scroll to current time (or 8:00) on mount
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
    <div className="flex flex-1 overflow-hidden">
      {/* Time gutter (sticky left) */}
      <div className="shrink-0 sticky left-0 z-10 bg-card border-r border-border/50">
        <TimeGutter />
      </div>

      {/* Scrollable days area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-auto"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="flex" style={{ minWidth: `${weekDays.length * 100}px` }}>
          {weekDays.map((day, dayIndex) => {
            const dayAppointments = appointments.filter((a) =>
              isSameDay(new Date(a.start_time), day),
            )
            return (
              <div key={dayIndex} className="flex-1 relative">
                {/* Grid lines — only render once per day, behind day column content */}
                {dayIndex === 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div style={{ height: '52px' }} />
                    <div className="relative" style={{ height: TOTAL_GRID_HEIGHT }}>
                      <GridLines />
                    </div>
                  </div>
                )}

                <CalendarDayColumn
                  date={day}
                  dayIndex={dayIndex}
                  appointments={dayAppointments}
                  onSlotClick={onSlotClick}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onResizeBottomStart={onResizeBottomStart}
                  onResizeTopStart={onResizeTopStart}
                  hoverSlot={hoverStates[dayIndex]}
                  onHoverSlotChange={(slot) => setHoverSlot(dayIndex, slot)}
                />
              </div>
            )
          })}
        </div>

        {/* Current time line — spans entire width, inside scroll area */}
        <div
          className="absolute pointer-events-none z-20"
          style={{
            top: '52px', // below headers
            left: TIME_LABEL_WIDTH,
            right: 0,
          }}
        >
          <CurrentTimeLine />
        </div>
      </div>
    </div>
  )
}
