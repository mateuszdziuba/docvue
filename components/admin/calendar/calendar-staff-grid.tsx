'use client'

import { useEffect, useRef, useState } from 'react'
import { isToday, format } from 'date-fns'
import { CalendarDayColumn } from './calendar-day-column'
import {
  HOUR_HEIGHT,
  START_HOUR,
  END_HOUR,
  TOTAL_GRID_HEIGHT,
  TIME_LABEL_WIDTH,
  PIXELS_PER_MINUTE,
} from './constants'
import type { CalendarAppointment } from '@/src/server/appointments'
import type { TimeBlock } from '@/src/server/time-blocks'
import type { StaffMember } from '@/types/database'

// ── Time gutter (mirrors calendar-grid implementation) ────────────────────────

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

// ── Grid lines (mirrors calendar-grid implementation) ─────────────────────────

function GridLines() {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
  return (
    <div className="absolute inset-0 pointer-events-none">
      {hours.map((_, i) => (
        <div key={i}>
          <div
            className="absolute left-0 right-0 border-t border-border/50"
            style={{ top: `${i * HOUR_HEIGHT}px` }}
          />
          <div
            className="absolute left-0 right-0 border-t border-dashed border-border/25"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.25}px` }}
          />
          <div
            className="absolute left-0 right-0 border-t border-border/35"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT * 0.5}px` }}
          />
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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StaffPendingSelection {
  date: Date
  hour: number
  minute: number
  durationMinutes: number
  staffId: string | null
}

interface CalendarStaffGridProps {
  selectedDay: Date
  staff: StaffMember[]
  appointments: CalendarAppointment[]
  timeBlocks?: TimeBlock[]
  snapMinutes: number
  isBlockMode: boolean
  dragGuideMinutes: number | null
  pendingSelection?: StaffPendingSelection | null
  onSlotSelect: (
    date: Date,
    hour: number,
    minute: number,
    durationMinutes: number | undefined,
    cursorX: number,
    cursorY: number,
    staffId: string | null,
  ) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CalendarAppointment['status']) => void
  onResizeBottomStart: (id: string, e: React.PointerEvent) => void
  onResizeTopStart: (id: string, e: React.PointerEvent) => void
  onDeleteTimeBlock: (id: string) => void
  onDrawGuide: (minutes: number | null) => void
}

const MIN_COL_WIDTH = 160 // px

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarStaffGrid({
  selectedDay,
  staff,
  appointments,
  timeBlocks: _timeBlocks,
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
}: CalendarStaffGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null)

  // Current time indicator
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

  // Per-column hover state; last slot = unassigned column
  const staffColumns = [
    ...staff.map((s) => ({ id: s.id, name: s.name, staffId: s.id as string | null })),
    { id: 'unassigned', name: 'Nieprzypisane', staffId: null as string | null },
  ]

  const [hoverStates, setHoverStates] = useState<
    Array<{ hour: number; minute: number } | null>
  >(() => Array(staffColumns.length).fill(null))

  const setHoverSlot = (colIdx: number, slot: { hour: number; minute: number } | null) => {
    setHoverStates((prev) => {
      const next = [...prev]
      next[colIdx] = slot
      return next
    })
  }

  // Scroll to current time on mount
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

      {/* Scrollable columns area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-auto relative"
        style={{ scrollbarGutter: 'stable' }}
      >
        {/* Cross-column alignment guide during drag */}
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

        <div
          className="flex relative"
          style={{ minWidth: `${staffColumns.length * MIN_COL_WIDTH}px` }}
        >
          {/* Grid lines spanning ALL columns */}
          <div
            className="absolute left-0 right-0 pointer-events-none z-0"
            style={{ top: '52px', height: `${TOTAL_GRID_HEIGHT}px` }}
          >
            <GridLines />
          </div>

          {staffColumns.map((col, colIdx) => {
            const colAppointments = appointments.filter((a) =>
              col.staffId === null ? a.staff_id === null : a.staff_id === col.staffId,
            )

            const colPending =
              pendingSelection && pendingSelection.staffId === col.staffId
                ? {
                    date: pendingSelection.date,
                    hour: pendingSelection.hour,
                    minute: pendingSelection.minute,
                    durationMinutes: pendingSelection.durationMinutes,
                  }
                : null

            return (
              <div
                key={col.id}
                className="flex-1 relative"
                style={{ minWidth: `${MIN_COL_WIDTH}px` }}
              >
                <CalendarDayColumn
                  date={selectedDay}
                  dayIndex={colIdx}
                  headerLabel={col.name}
                  appointments={colAppointments}
                  timeBlocks={[]}
                  snapMinutes={snapMinutes}
                  isBlockMode={isBlockMode}
                  currentTimeTop={isToday(selectedDay) ? currentTimeTop : null}
                  pendingSelection={colPending}
                  onSlotSelect={(date, hour, minute, durationMins, cx, cy) =>
                    onSlotSelect(date, hour, minute, durationMins, cx, cy, col.staffId)
                  }
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onResizeBottomStart={onResizeBottomStart}
                  onResizeTopStart={onResizeTopStart}
                  onDeleteTimeBlock={onDeleteTimeBlock}
                  onDrawGuide={onDrawGuide}
                  hoverSlot={hoverStates[colIdx] ?? null}
                  onHoverSlotChange={(slot) => setHoverSlot(colIdx, slot)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
