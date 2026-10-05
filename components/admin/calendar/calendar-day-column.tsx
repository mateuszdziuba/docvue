'use client'

import { useDroppable } from '@dnd-kit/core'
import { format, isToday, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { CalendarAppointment } from '@/src/server/appointments'
import type { TimeBlock } from '@/src/server/time-blocks'
import type { StaffMember } from '@/types/database'
import type { AppointmentUpdateChanges } from './appointment-popover'
import { CalendarAppointmentBlock } from './calendar-appointment'
import type { PendingSelection } from './calendar-grid'
import { END_HOUR, PIXELS_PER_MINUTE, START_HOUR, TOTAL_GRID_HEIGHT } from './constants'

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
  const [confirmOpen, setConfirmOpen] = useState(false)
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
  const staffName = block.staff_member?.name ?? null
  const baseLabel = block.label ?? 'Zarezerwowano'
  const label = staffName ? `${baseLabel} · ${staffName}` : baseLabel

  return (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${label}, ${format(blockStart, 'HH:mm')}–${format(blockEnd, 'HH:mm')}. Naciśnij Enter, aby usunąć.`}
            className="absolute left-0 right-0 z-[3] pointer-events-auto select-none border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ top: `${top}px`, height: `${height}px` }}
            data-time-block
            onClick={() => setConfirmOpen(true)}
          >
            <span className="absolute inset-0.5 block overflow-hidden rounded-md border border-muted-foreground/25 bg-muted/40">
              <span
                aria-hidden="true"
                className="absolute inset-0 text-muted-foreground opacity-30"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, currentColor 0px, currentColor 2.5px, transparent 2.5px, transparent 8px)',
                }}
              />
              {height >= 24 && (
                <span className="relative flex items-center gap-1 px-2 pt-1">
                  <span className="truncate text-xs font-medium text-muted-foreground">
                    {label}
                  </span>
                </span>
              )}
            </span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem
            className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Usuń rezerwację
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usunąć rezerwację czasu?</AlertDialogTitle>
          <AlertDialogDescription>
            {label}, {format(blockStart, 'd MMMM yyyy, HH:mm', { locale: pl })}–
            {format(blockEnd, 'HH:mm')}. Tej operacji nie można cofnąć.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onDelete(block.id)}
          >
            Usuń
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

interface CalendarDayColumnProps {
  date: Date
  dayIndex: number
  headerLabel?: string
  headerColorClass?: string
  headerInitials?: string
  appointments: CalendarAppointment[]
  timeBlocks: TimeBlock[]
  snapMinutes: number
  isBlockMode: boolean
  currentTimeTop?: number | null
  pendingSelection?: PendingSelection | null
  staffId?: string | null
  staffMembers?: Pick<StaffMember, 'id' | 'name'>[]
  showEmptyState?: boolean
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
  hoverSlot: { hour: number; minute: number } | null
  onHoverSlotChange: (slot: { hour: number; minute: number } | null) => void
}

export function CalendarDayColumn({
  date,
  dayIndex,
  headerLabel,
  headerColorClass,
  headerInitials,
  appointments,
  timeBlocks,
  snapMinutes,
  isBlockMode,
  currentTimeTop,
  pendingSelection,
  staffId,
  staffMembers = [],
  showEmptyState = true,
  onSlotSelect,
  onDelete,
  onStatusChange,
  onResizeBottomStart,
  onResizeTopStart,
  onDeleteTimeBlock,
  onDrawGuide,
  onUpdateAppointment,
  hoverSlot,
  onHoverSlotChange,
}: CalendarDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}${staffId ? `-${staffId}` : ''}`,
    data: { date, dayIndex, ...(staffId !== undefined ? { staffId: staffId ?? null } : {}) },
  })

  const today = isToday(date)
  const layouts = computeDayLayout(appointments)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)

  const [drawing, setDrawing] = useState<{ startMin: number; endMin: number } | null>(null)
  const drawingRef = useRef<{ startMin: number; endMin: number } | null>(null)
  const isDrawingRef = useRef(false)
  const columnRef = useRef<HTMLDivElement | null>(null)

  const updateDrawing = useCallback((d: { startMin: number; endMin: number } | null) => {
    drawingRef.current = d
    setDrawing(d)
  }, [])

  const getMinutesFromClientY = (clientY: number): number => {
    if (!columnRef.current) return 0
    const rect = columnRef.current.getBoundingClientRect()
    const y = Math.max(0, clientY - rect.top)
    return clampMinutes(minutesFromY(y))
  }

  const getSlotFromEvent = (
    e: React.MouseEvent<HTMLDivElement>,
  ): { hour: number; minute: number } | null => {
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
    // Portal events (popovers rendered in this React tree) must not start a draw
    if (!columnRef.current?.contains(target)) return

    // Touch: tap in an empty slot opens the slot context menu (no drag-to-create).
    // Ruch >10px lub przytrzymanie >400 ms traktujemy jako scroll.
    if (e.pointerType === 'touch') {
      const startX = e.clientX
      const startY = e.clientY
      const startTime = Date.now()
      const onTouchUp = (ev: PointerEvent) => {
        document.removeEventListener('pointerup', onTouchUp)
        document.removeEventListener('pointercancel', onTouchCancel)
        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY)
        if (moved > 10 || Date.now() - startTime > 400) return
        const rect = columnRef.current?.getBoundingClientRect()
        if (!rect) return
        const totalMinutes = snapToGrid(minutesFromY(ev.clientY - rect.top), snapMinutes)
        const hour = Math.floor(totalMinutes / 60) + START_HOUR
        const minute = totalMinutes % 60
        if (hour < START_HOUR || hour >= END_HOUR) return
        onSlotSelect(date, hour, minute, undefined, ev.clientX, ev.clientY)
      }
      const onTouchCancel = () => {
        document.removeEventListener('pointerup', onTouchUp)
        document.removeEventListener('pointercancel', onTouchCancel)
      }
      document.addEventListener('pointerup', onTouchUp)
      document.addEventListener('pointercancel', onTouchCancel)
      return
    }

    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
    if (e.button !== 0 || e.buttons > 1) return
    if (isDrawingRef.current) return

    e.preventDefault()
    isDrawingRef.current = true

    const startMin = snapToGrid(getMinutesFromClientY(e.clientY), snapMinutes)
    updateDrawing({ startMin, endMin: startMin + snapMinutes })
    onHoverSlotChange(null)

    const cleanup = () => {
      isDrawingRef.current = false
      updateDrawing(null)
      onDrawGuide(null)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
    }

    const onMove = (ev: PointerEvent) => {
      if (!isDrawingRef.current) return
      const endMin = snapToGrid(getMinutesFromClientY(ev.clientY), snapMinutes)
      const clamped = Math.max(startMin + snapMinutes, endMin)
      updateDrawing({ startMin, endMin: clamped })
      onDrawGuide(clamped)
    }

    const onUp = (ev: PointerEvent) => {
      if (!isDrawingRef.current) return
      const current = drawingRef.current
      cleanup()
      if (current) {
        const duration = current.endMin - current.startMin
        const { hour, minute } = minsToTime(current.startMin)
        onSlotSelect(
          date,
          hour,
          minute,
          duration > snapMinutes ? duration : undefined,
          ev.clientX,
          ev.clientY,
        )
      }
    }

    const onCancel = () => {
      cleanup()
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawingRef.current) return
    const target = e.target as HTMLElement
    if (target.closest('[data-apt]') || target.closest('[data-time-block]')) {
      onHoverSlotChange(null)
      return
    }
    if (!columnRef.current?.contains(target)) {
      onHoverSlotChange(null)
      return
    }
    onHoverSlotChange(getSlotFromEvent(e))
  }

  const handleMouseLeave = () => {
    if (!isDrawingRef.current) onHoverSlotChange(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (!target.hasAttribute('data-apt-block')) return
    if (e.key === 'Enter' || e.key === ' ') return

    const container = columnRef.current
    if (!container) return
    const blocks = Array.from(container.querySelectorAll<HTMLElement>('[data-apt-block]'))
    const index = blocks.indexOf(target)
    if (index === -1) return

    let next: HTMLElement | null = null

    if (e.key === 'ArrowDown') next = blocks[index + 1] ?? null
    else if (e.key === 'ArrowUp') next = blocks[index - 1] ?? null
    else if (e.key === 'Home') next = blocks[0] ?? null
    else if (e.key === 'End') next = blocks[blocks.length - 1] ?? null
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const columns = Array.from(document.querySelectorAll<HTMLElement>('[data-day-column]'))
      const columnIndex = columns.indexOf(container)
      const targetColumn = columns[columnIndex + (e.key === 'ArrowRight' ? 1 : -1)]
      if (targetColumn) {
        const targetBlocks = Array.from(
          targetColumn.querySelectorAll<HTMLElement>('[data-apt-block]'),
        )
        if (targetBlocks.length > 0) {
          const currentTop = Number.parseFloat(target.style.top || '0')
          next = targetBlocks.reduce((best, candidate) => {
            const bestDistance = Math.abs(Number.parseFloat(best.style.top || '0') - currentTop)
            const candidateDistance = Math.abs(
              Number.parseFloat(candidate.style.top || '0') - currentTop,
            )
            return candidateDistance < bestDistance ? candidate : best
          })
        }
      }
    }

    if (next) {
      e.preventDefault()
      for (const block of blocks) block.tabIndex = -1
      next.tabIndex = 0
      next.focus()
      const nextId = next.getAttribute('data-appointment-id')
      if (nextId) setActiveBlockId(nextId)
    }
  }

  const drawTop = drawing ? drawing.startMin * PIXELS_PER_MINUTE : 0
  const drawHeight = drawing
    ? Math.max(
        snapMinutes * PIXELS_PER_MINUTE,
        (drawing.endMin - drawing.startMin) * PIXELS_PER_MINUTE,
      )
    : 0

  return (
    <div className="flex flex-col min-w-0 flex-1 border-l border-border/60 first:border-l-0">
      {/* Day header */}
      <div
        className={`
          sticky top-0 z-10 h-[52px] flex flex-col items-center justify-center shrink-0
          border-b border-border/60 bg-card
          ${today && !headerLabel ? 'bg-primary/[0.04]' : ''}
        `}
      >
        {headerLabel ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground px-2 text-center truncate max-w-full">
            {headerColorClass && (
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${headerColorClass}`}
                aria-hidden="true"
              />
            )}
            {headerInitials && (
              <span className="text-[11px] font-bold text-muted-foreground" aria-hidden="true">
                {headerInitials}
              </span>
            )}
            <span className="truncate">{headerLabel}</span>
          </span>
        ) : (
          <>
            <span
              className={`text-[11px] font-semibold uppercase tracking-widest leading-none ${
                today ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {format(date, 'EEE', { locale: pl })}
            </span>
            <span
              className={`
                mt-1 text-sm font-bold leading-none flex items-center justify-center
                ${today ? 'w-7 h-7 rounded-md bg-primary text-primary-foreground' : 'text-foreground'}
              `}
            >
              {format(date, 'd')}
            </span>
          </>
        )}
      </div>

      {/* Column body */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: calendar drawing surface (draw-to-create, hover, keyboard block navigation) */}
      <div
        ref={(el) => {
          setNodeRef(el)
          columnRef.current = el
        }}
        data-day-column
        data-day-index={dayIndex}
        className={`relative select-none transition-colors duration-100 ${
          isOver && !isBlockMode ? 'bg-primary/[0.05]' : today ? 'bg-primary/[0.015]' : ''
        } ${isBlockMode ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
        onPointerDown={handlePointerDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
      >
        {/* Time block overlays */}
        {timeBlocks.map((block) => (
          <TimeBlockOverlay key={block.id} block={block} date={date} onDelete={onDeleteTimeBlock} />
        ))}

        {/* Current time line — only on today */}
        {currentTimeTop != null && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${currentTimeTop}px` }}
          >
            <div className="absolute left-0 right-0 h-px bg-destructive top-0" />
            <div
              className="absolute w-2 h-2 rounded-full bg-destructive"
              style={{ left: 0, top: '-3.5px' }}
            />
          </div>
        )}

        {/* Empty state — pionowo wzdłuż osi czasu */}
        {showEmptyState && appointments.length === 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground [writing-mode:vertical-rl]">
              Brak wizyt
            </p>
          </div>
        )}

        {/* Hover slot ghost (only when not drawing, not in block mode) */}
        {hoverSlot && !drawing && !isBlockMode && (
          <div
            className="absolute left-0.5 right-0.5 rounded-md bg-primary/[0.07] border border-dashed border-primary/40 pointer-events-none z-[1] flex items-center px-2"
            style={{
              top: `${(hoverSlot.hour * 60 + hoverSlot.minute - START_HOUR * 60) * PIXELS_PER_MINUTE}px`,
              height: `${snapMinutes * PIXELS_PER_MINUTE}px`,
            }}
          >
            <span className="text-xs text-primary font-medium tabular-nums">
              {String(hoverSlot.hour).padStart(2, '0')}:{String(hoverSlot.minute).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Block-mode hover hint */}
        {hoverSlot && !drawing && isBlockMode && (
          <div
            className="absolute left-0.5 right-0.5 rounded-md bg-destructive/[0.07] border border-dashed border-destructive/40 pointer-events-none z-[1] flex items-center px-2"
            style={{
              top: `${(hoverSlot.hour * 60 + hoverSlot.minute - START_HOUR * 60) * PIXELS_PER_MINUTE}px`,
              height: `${snapMinutes * PIXELS_PER_MINUTE}px`,
            }}
          >
            <span className="text-xs text-destructive font-medium tabular-nums">
              {String(hoverSlot.hour).padStart(2, '0')}:{String(hoverSlot.minute).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Pending selection ghost — stays visible while context menu is open */}
        {!drawing && pendingSelection && (
          <div
            className="absolute left-0.5 right-0.5 rounded-md pointer-events-none z-[5] bg-primary/[0.12] border border-primary/40"
            style={{
              top: `${(pendingSelection.hour * 60 + pendingSelection.minute - START_HOUR * 60) * PIXELS_PER_MINUTE}px`,
              height: `${Math.max(pendingSelection.durationMinutes * PIXELS_PER_MINUTE, snapMinutes * PIXELS_PER_MINUTE)}px`,
            }}
          />
        )}

        {/* Draw-to-create preview */}
        {drawing && (
          <div
            className={`absolute left-0.5 right-0.5 rounded-md pointer-events-none z-[5] flex flex-col justify-between px-2 py-1 ${
              isBlockMode
                ? 'bg-destructive/[0.12] border border-destructive/40'
                : 'bg-primary/[0.12] border border-primary/40'
            }`}
            style={{ top: `${drawTop}px`, height: `${drawHeight}px` }}
          >
            <span
              className={`text-xs font-semibold tabular-nums ${isBlockMode ? 'text-destructive' : 'text-primary'}`}
            >
              {formatMinutes(drawing.startMin)}
            </span>
            {drawHeight >= 32 && (
              <span
                className={`text-xs font-medium tabular-nums self-end ${isBlockMode ? 'text-destructive' : 'text-primary'}`}
              >
                {formatMinutes(drawing.endMin)}
              </span>
            )}
          </div>
        )}

        {/* Appointment blocks */}
        {layouts.map(({ appointment, top, height, left, width }, index) => (
          <div key={appointment.id} data-apt>
            <CalendarAppointmentBlock
              appointment={appointment}
              layout={{ top, height, left, width }}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onResizeBottomStart={onResizeBottomStart}
              onResizeTopStart={onResizeTopStart}
              staffMembers={staffMembers}
              onUpdate={onUpdateAppointment}
              tabIndex={
                activeBlockId === appointment.id || (activeBlockId === null && index === 0) ? 0 : -1
              }
              onFocusBlock={setActiveBlockId}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
