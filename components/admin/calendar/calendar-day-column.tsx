'use client'

import { useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { parseISO, format, isToday } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { CalendarAppointmentBlock } from './calendar-appointment'
import { PIXELS_PER_MINUTE, START_HOUR, END_HOUR, TOTAL_GRID_HEIGHT } from './constants'
import type { CalendarAppointment } from '@/actions/appointments'
import type { TimeBlock } from '@/actions/time-blocks'

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

  const columns: CalendarAppointment[][] = []

  for (const apt of sorted) {
    const aptStart = new Date(apt.start_time).getTime()
    const aptEnd = aptStart + apt.duration_minutes * 60_000

    let placed = false
    for (const col of columns) {
      const lastApt = col[col.length - 1]
      const lastEnd = new Date(lastApt.start_time).getTime() + lastApt.duration_minutes * 60_000
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function snapToGrid(totalMinutes: number, snapMinutes: number): number {
  return Math.round(totalMinutes / snapMinutes) * snapMinutes
}

function minutesFromY(y: number): number {
  return Math.floor(y / PIXELS_PER_MINUTE)
}

function clampMinutes(m: number): number {
  return Math.max(0, Math.min((END_HOUR - START_HOUR) * 60, m))
}

function minsToTime(totalMins: number): { hour: number; minute: number } {
  const abs = START_HOUR * 60 + totalMins
  return { hour: Math.floor(abs / 60), minute: abs % 60 }
}

function formatMinutes(totalMins: number): string {
  const { hour, minute } = minsToTime(totalMins)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// ── Time block overlay ───────────────────────────────────────────────────────

interface TimeBlockOverlayProps {
  block: TimeBlock
  date: Date
  onDelete: (id: string) => void
}

function TimeBlockOverlay({ block, date, onDelete }: TimeBlockOverlayProps) {
  const blockStart = new Date(block.start_time)
  const blockEnd = new Date(block.end_time)

  const dayStart = new Date(date)
  dayStart.setHours(START_HOUR, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(END_HOUR, 0, 0, 0)

  const visStart = blockStart < dayStart ? dayStart : blockStart
  const visEnd = blockEnd > dayEnd ? dayEnd : blockEnd

  const topMins = visStart.getHours() * 60 + visStart.getMinutes() - START_HOUR * 60
  const endMins = visEnd.getHours() * 60 + visEnd.getMinutes() - START_HOUR * 60
  const heightMins = endMins - topMins

  if (heightMins <= 0) return null

  const top = topMins * PIXELS_PER_MINUTE
  const height = heightMins * PIXELS_PER_MINUTE

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="absolute left-0 right-0 z-[3] pointer-events-auto select-none"
          style={{ top: `${top}px`, height: `${height}px` }}
          data-time-block
        >
          <div
            className="absolute inset-0.5 rounded-lg border border-destructive/20 overflow-hidden"
            style={{
              background: 'repeating-linear-gradient(45deg, hsl(var(--destructive)/0.05) 0px, hsl(var(--destructive)/0.05) 2px, transparent 2px, transparent 10px)',
              backgroundColor: 'hsl(var(--destructive)/0.04)',
            }}
          >
            {height >= 24 && (
              <div className="flex items-center gap-1 px-2 pt-1">
                <span className="text-[10px] font-medium text-destructive/70 truncate">
                  {block.label ?? 'Zarezerwowano'}
                </span>
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2"
          onClick={() => onDelete(block.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Usuń rezerwację
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

interface CalendarDayColumnProps {
  date: Date
  dayIndex: number
  appointments: CalendarAppointment[]
  timeBlocks: TimeBlock[]
  snapMinutes: number
  isBlockMode: boolean
  onSlotClick: (date: Date, hour: number, minute: number, durationMinutes?: number, isBlock?: boolean) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CalendarAppointment['status']) => void
  onResizeBottomStart: (id: string, e: React.PointerEvent) => void
  onResizeTopStart: (id: string, e: React.PointerEvent) => void
  onDeleteTimeBlock: (id: string) => void
  onDrawGuide: (minutes: number | null) => void
  hoverSlot: { hour: number; minute: number } | null
  onHoverSlotChange: (slot: { hour: number; minute: number } | null) => void
}

export function CalendarDayColumn({
  date,
  dayIndex,
  appointments,
  timeBlocks,
  snapMinutes,
  isBlockMode,
  onSlotClick,
  onDelete,
  onStatusChange,
  onResizeBottomStart,
  onResizeTopStart,
  onDeleteTimeBlock,
  onDrawGuide,
  hoverSlot,
  onHoverSlotChange,
}: CalendarDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { date, dayIndex },
  })

  const today = isToday(date)
  const layouts = computeDayLayout(appointments)

  const [drawing, setDrawing] = useState<{ startMin: number; endMin: number } | null>(null)
  const isDrawingRef = useRef(false)
  const columnRef = useRef<HTMLDivElement | null>(null)

  const getMinutesFromClientY = (clientY: number): number => {
    if (!columnRef.current) return 0
    const rect = columnRef.current.getBoundingClientRect()
    const y = Math.max(0, clientY - rect.top)
    return clampMinutes(minutesFromY(y))
  }

  const getSlotFromEvent = (e: React.MouseEvent<HTMLDivElement>): { hour: number; minute: number } | null => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const totalMinutes = snapToGrid(minutesFromY(y), snapMinutes)
    const hour = Math.floor(totalMinutes / 60) + START_HOUR
    const minute = totalMinutes % 60
    if (hour < START_HOUR || hour >= END_HOUR) return null
    return { hour, minute }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-apt]') || target.closest('[data-time-block]')) return
    if (e.button !== 0) return

    e.preventDefault()
    isDrawingRef.current = true

    const startMin = snapToGrid(getMinutesFromClientY(e.clientY), snapMinutes)
    setDrawing({ startMin, endMin: startMin + snapMinutes })
    onHoverSlotChange(null)

    const onMove = (ev: PointerEvent) => {
      if (!isDrawingRef.current) return
      const endMin = snapToGrid(getMinutesFromClientY(ev.clientY), snapMinutes)
      const clamped = Math.max(startMin + snapMinutes, endMin)
      setDrawing({ startMin, endMin: clamped })
      onDrawGuide(clamped)
    }

    const onUp = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      onDrawGuide(null)

      setDrawing((prev) => {
        if (!prev) return null
        const duration = prev.endMin - prev.startMin
        const { hour, minute } = minsToTime(prev.startMin)
        onSlotClick(date, hour, minute, duration > snapMinutes ? duration : undefined, isBlockMode)
        return null
      })

      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawingRef.current) return
    const target = e.target as HTMLElement
    if (target.closest('[data-apt]') || target.closest('[data-time-block]')) {
      onHoverSlotChange(null)
      return
    }
    onHoverSlotChange(getSlotFromEvent(e))
  }

  const handleMouseLeave = () => {
    if (!isDrawingRef.current) onHoverSlotChange(null)
  }

  const drawTop = drawing ? drawing.startMin * PIXELS_PER_MINUTE : 0
  const drawHeight = drawing
    ? Math.max(snapMinutes * PIXELS_PER_MINUTE, (drawing.endMin - drawing.startMin) * PIXELS_PER_MINUTE)
    : 0
  const isBlock = isBlockMode

  return (
    <div className="flex flex-col min-w-0 flex-1 border-l border-border/40 first:border-l-0">
      {/* Day header */}
      <div
        className={`
          h-[52px] flex flex-col items-center justify-center shrink-0
          border-b border-border/40
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
            ${today ? 'w-7 h-7 rounded-full bg-primary text-primary-foreground' : 'text-foreground'}
          `}
        >
          {format(date, 'd')}
        </span>
      </div>

      {/* Column body */}
      <div
        ref={(el) => {
          setNodeRef(el)
          columnRef.current = el
        }}
        className={`relative select-none transition-colors duration-100 ${
          isOver && !isBlockMode ? 'bg-primary/[0.05]' : today ? 'bg-primary/[0.015]' : ''
        } ${isBlockMode ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
        onPointerDown={handlePointerDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Time block overlays */}
        {timeBlocks.map((block) => (
          <TimeBlockOverlay
            key={block.id}
            block={block}
            date={date}
            onDelete={onDeleteTimeBlock}
          />
        ))}

        {/* Hover slot ghost (only when not drawing, not in block mode) */}
        {hoverSlot && !drawing && !isBlockMode && (
          <div
            className="absolute left-0.5 right-0.5 rounded-lg bg-primary/[0.07] border border-dashed border-primary/25 pointer-events-none z-[1] flex items-center px-2"
            style={{
              top: `${(hoverSlot.hour * 60 + hoverSlot.minute - START_HOUR * 60) * PIXELS_PER_MINUTE}px`,
              height: `${snapMinutes * PIXELS_PER_MINUTE}px`,
            }}
          >
            <span className="text-[10px] text-primary/50 font-medium tabular-nums">
              {String(hoverSlot.hour).padStart(2, '0')}:{String(hoverSlot.minute).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Block-mode hover hint */}
        {hoverSlot && !drawing && isBlockMode && (
          <div
            className="absolute left-0.5 right-0.5 rounded-lg bg-destructive/[0.07] border border-dashed border-destructive/25 pointer-events-none z-[1] flex items-center px-2"
            style={{
              top: `${(hoverSlot.hour * 60 + hoverSlot.minute - START_HOUR * 60) * PIXELS_PER_MINUTE}px`,
              height: `${snapMinutes * PIXELS_PER_MINUTE}px`,
            }}
          >
            <span className="text-[10px] text-destructive/50 font-medium tabular-nums">
              {String(hoverSlot.hour).padStart(2, '0')}:{String(hoverSlot.minute).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Draw-to-create preview */}
        {drawing && (
          <div
            className={`absolute left-0.5 right-0.5 rounded-lg pointer-events-none z-[5] flex flex-col justify-between px-2 py-1 ${
              isBlock
                ? 'bg-destructive/[0.12] border border-destructive/40'
                : 'bg-primary/[0.12] border border-primary/40'
            }`}
            style={{ top: `${drawTop}px`, height: `${drawHeight}px` }}
          >
            <span className={`text-[10px] font-semibold tabular-nums ${isBlock ? 'text-destructive' : 'text-primary'}`}>
              {formatMinutes(drawing.startMin)}
            </span>
            {drawHeight >= 32 && (
              <span className={`text-[10px] font-medium tabular-nums self-end ${isBlock ? 'text-destructive/70' : 'text-primary/70'}`}>
                {formatMinutes(drawing.endMin)}
              </span>
            )}
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
