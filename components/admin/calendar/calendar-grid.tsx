'use client'

import { useEffect, useRef, useState } from 'react'
import { addDays, isSameDay, isToday, format } from 'date-fns'
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
import type { TimeBlock } from '@/actions/time-blocks'

// ── Time gutter ──────────────────────────────────────────────────────────────

function TimeGutter({ currentTimeTop }: { currentTimeTop: number | null }) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
  return (
    <div
      className="shrink-0 select-none relative"
      style={{ width: TIME_LABEL_WIDTH, minWidth: TIME_LABEL_WIDTH }}
    >
      <div className="h-[52px] border-b border-border/40" />
      {hours.map((hour) => (
        <div
          key={hour}
          className="relative border-t border-transparent"
          style={{ height: HOUR_HEIGHT }}
        >
          <span className="absolute -top-[9px] right-2 text-[10px] font-medium text-muted-foreground/50 tabular-nums leading-none select-none">
            {String(hour).padStart(2, '0')}:00
          </span>
        </div>
      ))}
      {/* Current time label aligned with hour labels */}
      {currentTimeTop !== null && (
        <div
          className="absolute right-0 left-0 pointer-events-none z-30 flex items-center justify-end pr-1.5"
          style={{ top: `${52 + currentTimeTop}px` }}
        >
          <span className="text-[9px] tabular-nums text-destructive font-bold leading-none bg-background/90 px-0.5 rounded-sm -translate-y-[5px]">
            {format(new Date(), 'HH:mm')}
          </span>
        </div>
      )}
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
          {/* Hour line — solid */}
          <div
            className="absolute left-0 right-0 border-t border-border/50"
            style={{ top: `${i * HOUR_HEIGHT}px` }}
          />
          {/* 15-min line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-border/25"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.25}px` }}
          />
          {/* 30-min line — slightly stronger */}
          <div
            className="absolute left-0 right-0 border-t border-border/35"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.5}px` }}
          />
          {/* 45-min line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-border/25"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.75}px` }}
          />
        </div>
      ))}
      <div
        className="absolute left-0 right-0 border-t border-border/50"
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
  onSlotSelect: (date: Date, hour: number, minute: number, durationMinutes: number | undefined, cursorX: number, cursorY: number) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CalendarAppointment['status']) => void
  onResizeBottomStart: (id: string, e: React.PointerEvent) => void
  onResizeTopStart: (id: string, e: React.PointerEvent) => void
  onDeleteTimeBlock: (id: string) => void
  onDrawGuide: (minutes: number | null) => void
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
  onSlotSelect,
  onDelete,
  onStatusChange,
  onResizeBottomStart,
  onResizeTopStart,
  onDeleteTimeBlock,
  onDrawGuide,
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
    <div className="flex flex-1 overflow-hidden">
      {/* Time gutter (sticky left) */}
      <div className="shrink-0 sticky left-0 z-10 bg-card border-r border-border/40">
        <TimeGutter currentTimeTop={currentTimeTop} />
      </div>

      {/* Scrollable days area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-auto relative"
        style={{ scrollbarGutter: 'stable' }}
      >
        {/* Cross-column alignment guide */}
        {dragGuideMinutes !== null && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-40"
            style={{ top: `${52 + dragGuideMinutes * PIXELS_PER_MINUTE}px` }}
          >
            <div className="flex items-center">
              <div className="flex-1 border-t-2 border-dashed border-primary/60" />
            </div>
          </div>
        )}

        <div className="flex relative" style={{ minWidth: `${weekDays.length * 100}px` }}>
          {/* Grid lines spanning ALL columns */}
          <div
            className="absolute left-0 right-0 pointer-events-none z-0"
            style={{ top: `${52}px`, height: `${TOTAL_GRID_HEIGHT}px` }}
          >
            <GridLines />
          </div>

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
              <div key={dayIndex} className="flex-1 relative">
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
                  onSlotSelect={onSlotSelect}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onResizeBottomStart={onResizeBottomStart}
                  onResizeTopStart={onResizeTopStart}
                  onDeleteTimeBlock={onDeleteTimeBlock}
                  onDrawGuide={onDrawGuide}
                  hoverSlot={hoverStates[dayIndex]}
                  onHoverSlotChange={(slot) => setHoverSlot(dayIndex, slot)}
                />
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
