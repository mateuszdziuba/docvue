'use client'

import { isToday } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { groupAppointmentsByStaff } from '@/src/lib/appointment-overlap'
import type { CalendarAppointment } from '@/src/server/appointments'
import type { TimeBlock } from '@/src/server/time-blocks'
import type { StaffMember } from '@/types/database'
import type { AppointmentUpdateChanges } from './appointment-popover'
import { CalendarDayColumn } from './calendar-day-column'
import { GridLines, TimeGutter } from './calendar-grid'
import {
  END_HOUR,
  PIXELS_PER_MINUTE,
  START_HOUR,
  TIME_LABEL_WIDTH,
  TOTAL_GRID_HEIGHT,
} from './constants'
import { staffColor, staffInitials } from './staff-colors'

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
  staff: Pick<StaffMember, 'id' | 'name'>[]
  staffFilter?: string
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
  onUpdateAppointment?: (
    id: string,
    changes: AppointmentUpdateChanges,
  ) => Promise<{ error?: string | null }>
}

const MIN_COL_WIDTH = 160 // px

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarStaffGrid({
  selectedDay,
  staff,
  staffFilter = 'all',
  appointments,
  timeBlocks = [],
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
  onUpdateAppointment,
}: CalendarStaffGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null)

  const filtering = staffFilter !== 'all' && staff.some((member) => member.id === staffFilter)
  const visibleStaff = filtering ? staff.filter((member) => member.id === staffFilter) : staff
  const scopedAppointments = filtering
    ? appointments.filter((appointment) => appointment.staff_id === staffFilter)
    : appointments

  const groups = groupAppointmentsByStaff(scopedAppointments, visibleStaff, {
    includeUnassigned: !filtering,
  })

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

  const [hoverStates, setHoverStates] = useState<Array<{ hour: number; minute: number } | null>>(
    () => Array(groups.length).fill(null),
  )

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
    <div className="relative flex flex-1 min-h-0 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto overscroll-contain"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div
          className="relative flex"
          style={{ minWidth: `${TIME_LABEL_WIDTH + groups.length * MIN_COL_WIDTH}px` }}
        >
          {/* Time gutter — przewija się w pionie razem z siatką, w poziomie przyklejona */}
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-border/60 bg-card"
            style={{ width: TIME_LABEL_WIDTH, minWidth: TIME_LABEL_WIDTH }}
          >
            <TimeGutter currentTimeTop={currentTimeTop} />
          </div>

          <div className="relative min-w-0 flex-1">
            {/* Cross-column alignment guide during drag */}
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
              style={{ top: '52px', height: `${TOTAL_GRID_HEIGHT}px` }}
            >
              <GridLines />
            </div>

            <div className="flex">
              {groups.map((group, colIdx) => {
                const color = staffColor(group.staffId)
                const colPending =
                  pendingSelection && pendingSelection.staffId === group.staffId
                    ? {
                        date: pendingSelection.date,
                        hour: pendingSelection.hour,
                        minute: pendingSelection.minute,
                        durationMinutes: pendingSelection.durationMinutes,
                      }
                    : null

                return (
                  <div
                    key={group.staffId ?? 'unassigned'}
                    className="flex-1 relative"
                    style={{ minWidth: `${MIN_COL_WIDTH}px` }}
                  >
                    <CalendarDayColumn
                      date={selectedDay}
                      dayIndex={colIdx}
                      headerLabel={group.staffName}
                      headerColorClass={color.solidClass}
                      headerInitials={group.staffId ? staffInitials(group.staffName) : undefined}
                      appointments={group.appointments}
                      timeBlocks={timeBlocks.filter(
                        (block) => block.staff_id == null || block.staff_id === group.staffId,
                      )}
                      snapMinutes={snapMinutes}
                      isBlockMode={isBlockMode}
                      currentTimeTop={isToday(selectedDay) ? currentTimeTop : null}
                      pendingSelection={colPending}
                      staffId={group.staffId}
                      staffMembers={visibleStaff}
                      showEmptyState={false}
                      onSlotSelect={(date, hour, minute, durationMins, cx, cy) =>
                        onSlotSelect(date, hour, minute, durationMins, cx, cy, group.staffId)
                      }
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      onResizeBottomStart={onResizeBottomStart}
                      onResizeTopStart={onResizeTopStart}
                      onDeleteTimeBlock={onDeleteTimeBlock}
                      onDrawGuide={onDrawGuide}
                      onUpdateAppointment={onUpdateAppointment}
                      hoverSlot={hoverStates[colIdx] ?? null}
                      onHoverSlotChange={(slot) => setHoverSlot(colIdx, slot)}
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
