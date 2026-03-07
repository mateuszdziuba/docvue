'use client'

import { useDroppable } from '@dnd-kit/core'
import { parseISO, format, isSameDay, isToday } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CalendarAppointmentBlock, type AppointmentLayoutInfo } from './calendar-appointment'
import { PIXELS_PER_MINUTE, START_HOUR, END_HOUR, TOTAL_GRID_HEIGHT, SNAP_MINUTES, HOUR_HEIGHT } from './constants'
import type { CalendarAppointment } from '@/actions/appointments'

// ── Overlap layout algorithm ─────────────────────────────────────────────────

interface LayoutEntry {
  appointment: CalendarAppointment
  top: number
  height: number
  left: number
  width: number
}

function computeDayLayout(appointments: CalendarAppointment[]): LayoutEntry[] {
  if (appointments.length === 0) return []

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  // Assign each appointment to the first available column where it doesn't overlap
  const columns: CalendarAppointment[][] = []

  for (const apt of sorted) {
    const aptStart = new Date(apt.start_time).getTime()
    const aptEnd = aptStart + apt.duration_minutes * 60_000

    let placed = false
    for (const col of columns) {
      const lastApt = col[col.length - 1]
      const lastEnd =
        new Date(lastApt.start_time).getTime() + lastApt.duration_minutes * 60_000
      if (aptStart >= lastEnd) {
        col.push(apt)
        placed = true
        break
      }
    }
    if (!placed) columns.push([apt])
  }

  const totalCols = columns.length
  const result: LayoutEntry[] = []

  columns.forEach((col, colIdx) => {
    col.forEach((apt) => {
      const startDate = parseISO(apt.start_time)
      const minutesFromGridStart =
        startDate.getHours() * 60 + startDate.getMinutes() - START_HOUR * 60
      result.push({
        appointment: apt,
        top: minutesFromGridStart * PIXELS_PER_MINUTE,
        height: apt.duration_minutes * PIXELS_PER_MINUTE,
        left: colIdx / totalCols,
        width: 1 / totalCols,
      })
    })
  })

  return result
}

// ── Component ────────────────────────────────────────────────────────────────

interface CalendarDayColumnProps {
  date: Date
  dayIndex: number
  appointments: CalendarAppointment[]
  onSlotClick: (date: Date, hour: number, minute: number) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CalendarAppointment['status']) => void
  onResizeBottomStart: (id: string, e: React.PointerEvent) => void
  onResizeTopStart: (id: string, e: React.PointerEvent) => void
  // Hover slot preview
  hoverSlot: { hour: number; minute: number } | null
  onHoverSlotChange: (slot: { hour: number; minute: number } | null) => void
}

export function CalendarDayColumn({
  date,
  dayIndex,
  appointments,
  onSlotClick,
  onDelete,
  onStatusChange,
  onResizeBottomStart,
  onResizeTopStart,
  hoverSlot,
  onHoverSlotChange,
}: CalendarDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { date, dayIndex },
  })

  const today = isToday(date)
  const layouts = computeDayLayout(appointments)

  const getSlotFromEvent = (e: React.MouseEvent<HTMLDivElement>): { hour: number; minute: number } | null => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const totalMinutes = Math.floor(y / PIXELS_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES
    const hour = Math.floor(totalMinutes / 60) + START_HOUR
    const minute = totalMinutes % 60
    if (hour < START_HOUR || hour >= END_HOUR) return null
    return { hour, minute }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-apt]')) {
      onHoverSlotChange(null)
      return
    }
    onHoverSlotChange(getSlotFromEvent(e))
  }

  const handleMouseLeave = () => onHoverSlotChange(null)

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-apt]')) return
    const slot = getSlotFromEvent(e)
    if (slot) onSlotClick(date, slot.hour, slot.minute)
  }

  return (
    <div className="flex flex-col min-w-0 flex-1 border-l border-border/50 first:border-l-0">
      {/* Day header */}
      <div
        className={`
          h-[52px] flex flex-col items-center justify-center shrink-0
          border-b border-border/50
          ${today ? 'bg-primary/[0.04]' : ''}
        `}
      >
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest leading-none ${
            today ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          {format(date, 'EEE', { locale: pl })}
        </span>
        <span
          className={`
            mt-1 text-sm font-bold leading-none flex items-center justify-center
            ${today
              ? 'w-7 h-7 rounded-full bg-primary text-primary-foreground'
              : 'text-foreground'}
          `}
        >
          {format(date, 'd')}
        </span>
      </div>

      {/* Column body (droppable) */}
      <div
        ref={setNodeRef}
        className={`relative cursor-pointer transition-colors duration-100 ${
          isOver ? 'bg-primary/[0.06]' : today ? 'bg-primary/[0.02]' : ''
        }`}
        style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Hover slot ghost — shows where click-to-create will land */}
        {hoverSlot && (
          <div
            className="absolute left-0.5 right-0.5 rounded-[4px] bg-primary/8 border border-dashed border-primary/30 pointer-events-none z-[1] flex items-center px-2"
            style={{
              top: `${(hoverSlot.hour * 60 + hoverSlot.minute - START_HOUR * 60) * PIXELS_PER_MINUTE}px`,
              height: `${SNAP_MINUTES * PIXELS_PER_MINUTE}px`,
            }}
          >
            <span className="text-[10px] text-primary/60 font-medium tabular-nums">
              {String(hoverSlot.hour).padStart(2, '0')}:{String(hoverSlot.minute).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Appointment blocks */}
        {layouts.map(({ appointment, top, height, left, width }) => (
          <div key={appointment.id} data-apt>
            <CalendarAppointmentBlock
              appointment={appointment}
              layout={{ top, height, left, width }}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onResizeBottomStart={onResizeBottomStart}
              onResizeTopStart={onResizeTopStart}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
