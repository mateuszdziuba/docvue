'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { addMinutes, format, parseISO } from 'date-fns'
import { CalendarCheck, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  APPOINTMENT_STATUS_CONFIG,
  type AppointmentStatus,
  StatusBadge,
} from '@/components/admin/status-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CalendarAppointment } from '@/src/server/appointments'
import type { StaffMember } from '@/types/database'
import { AppointmentPopover, type AppointmentUpdateChanges } from './appointment-popover'
import { staffColor, staffInitials } from './staff-colors'
import { treatmentColor } from './treatment-colors'

const BLOCK_CFG: Record<
  AppointmentStatus,
  { bg: string; text: string; subtext: string; timeText: string; border: string }
> = {
  scheduled: {
    bg: 'bg-info-container',
    text: 'text-on-info-container',
    subtext: 'text-on-info-container/80',
    timeText: 'text-on-info-container/90',
    border: 'border-info/45',
  },
  pending_forms: {
    bg: 'bg-warning-container',
    text: 'text-on-warning-container',
    subtext: 'text-on-warning-container/80',
    timeText: 'text-on-warning-container/90',
    border: 'border-warning/60',
  },
  completed: {
    bg: 'bg-success-container',
    text: 'text-on-success-container',
    subtext: 'text-on-success-container/80',
    timeText: 'text-on-success-container/90',
    border: 'border-success/50',
  },
  cancelled: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    subtext: 'text-muted-foreground',
    timeText: 'text-muted-foreground',
    border: 'border-border',
  },
}

export interface AppointmentLayoutInfo {
  top: number
  height: number
  left: number // 0–1 fraction of column width
  width: number // 0–1 fraction of column width
}

interface CalendarAppointmentBlockProps {
  appointment: CalendarAppointment
  layout: AppointmentLayoutInfo
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CalendarAppointment['status']) => void
  onResizeBottomStart: (id: string, e: React.PointerEvent) => void
  onResizeTopStart: (id: string, e: React.PointerEvent) => void
  staffMembers?: Pick<StaffMember, 'id' | 'name'>[]
  onUpdate?: (id: string, changes: AppointmentUpdateChanges) => Promise<{ error?: string | null }>
  tabIndex?: number
  onFocusBlock?: (id: string) => void
}

export function CalendarAppointmentBlock({
  appointment,
  layout,
  onDelete,
  onStatusChange,
  onResizeBottomStart,
  onResizeTopStart,
  staffMembers = [],
  onUpdate,
  tabIndex = -1,
  onFocusBlock,
}: CalendarAppointmentBlockProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [hoverCard, setHoverCard] = useState<{ x: number; y: number } | null>(null)
  const hoverTimerRef = useRef<number | null>(null)
  const hoverActiveRef = useRef(false)
  const pointerDownRef = useRef({ x: 0, y: 0 })

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
  })

  const statusConfig = APPOINTMENT_STATUS_CONFIG[appointment.status]
  const cfg = BLOCK_CFG[appointment.status]
  const staffName = appointment.staff_member?.name ?? null
  const color = staffColor(appointment.staff_member?.id ?? appointment.staff_id)
  const initials = staffInitials(staffName)
  const tint = treatmentColor(appointment.treatment.id || appointment.treatment_id)

  const startDate = parseISO(appointment.start_time)
  const endDate = addMinutes(startDate, appointment.duration_minutes)
  const heightPx = Math.max(layout.height, 20)
  const isCompact = heightPx < 48
  const isTiny = heightPx < 28
  const isCancelled = appointment.status === 'cancelled'

  const ariaLabel = [
    `${format(startDate, 'HH:mm')}–${format(endDate, 'HH:mm')}`,
    appointment.client.name,
    appointment.treatment.name,
    staffName ?? 'Nieprzypisany pracownik',
    statusConfig.label,
  ].join(', ')

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY }
    hoverActiveRef.current = false
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
    setHoverCard(null)
  }

  useEffect(() => {
    if (isDragging || popoverOpen) setHoverCard(null)
  }, [isDragging, popoverOpen])

  useEffect(() => {
    if (!hoverCard) return
    const hide = () => setHoverCard(null)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [hoverCard])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
    }
  }, [])

  const scheduleHoverCard = (element: HTMLElement) => {
    hoverActiveRef.current = true
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = window.setTimeout(() => {
      if (!hoverActiveRef.current) return
      const rect = element.getBoundingClientRect()
      const width = 264
      const gap = 10
      let x = rect.right + gap
      if (x + width > window.innerWidth - 8) x = rect.left - width - gap
      if (x < 8) x = Math.max(8, window.innerWidth - width - 8)
      const estimatedHeight = 132
      const y = Math.min(Math.max(rect.top, 8), window.innerHeight - estimatedHeight - 8)
      setHoverCard({ x, y })
    }, 300)
  }

  const cancelHoverCard = () => {
    hoverActiveRef.current = false
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
    setHoverCard(null)
  }

  const handleClick = (e: React.MouseEvent) => {
    const dx = Math.abs(e.clientX - pointerDownRef.current.x)
    const dy = Math.abs(e.clientY - pointerDownRef.current.y)
    if (dx < 5 && dy < 5 && !isDragging) {
      setPopoverOpen(true)
    }
  }

  const blockStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${layout.top}px`,
    height: `${heightPx}px`,
    left: `calc(${layout.left * 100}% + 2px)`,
    width: `calc(${layout.width * 100}% - 4px)`,
    zIndex: isDragging ? 0 : 2,
    opacity: isDragging ? 0.25 : 1,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    backgroundImage: isCancelled
      ? undefined
      : `linear-gradient(90deg, ${tint.wash}, transparent 60%)`,
  }

  const statusMenuItems = (
    Object.entries(APPOINTMENT_STATUS_CONFIG) as Array<
      [AppointmentStatus, { label: string; dotClass: string }]
    >
  ).map(([status, config]) => ({ status, label: config.label, dotClass: config.dotClass }))

  const menuContent = (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <CalendarCheck className="w-3.5 h-3.5 mr-2 opacity-70" />
          Zmień status
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {statusMenuItems.map(({ status, label, dotClass }) => (
            <DropdownMenuItem
              key={status}
              onClick={() => onStatusChange(appointment.id, status)}
              className={`gap-2 ${appointment.status === status ? 'font-semibold' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full ${dotClass}`} />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <a href={`/dashboard/visits/${appointment.id}`}>
          <ExternalLink className="w-3.5 h-3.5 mr-2 opacity-70" />
          Szczegóły wizyty
        </a>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive focus:text-destructive focus:bg-destructive/10"
        onClick={() => onDelete(appointment.id)}
      >
        <Trash2 className="w-3.5 h-3.5 mr-2" />
        Usuń wizytę
      </DropdownMenuItem>
    </>
  )

  return (
    <>
      <AppointmentPopover
        appointment={appointment}
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        staffMembers={staffMembers}
        onUpdate={onUpdate}
        onStatusChange={onStatusChange}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: appointment card is a draggable surface that contains its own menu button */}
        <div
          ref={setNodeRef}
          role="button"
          tabIndex={tabIndex}
          aria-label={ariaLabel}
          data-apt-block
          data-appointment-id={appointment.id}
          style={blockStyle}
          className={`
          group rounded-md border ${cfg.bg} ${cfg.border}
          hover:shadow-md
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
          transition-shadow duration-150 overflow-hidden text-left touch-manipulation
          ${isCancelled ? 'opacity-100' : ''}
        `}
          onPointerDown={handlePointerDown}
          onPointerEnter={(e) => {
            if (e.pointerType !== 'mouse') return
            scheduleHoverCard(e.currentTarget)
          }}
          onPointerLeave={cancelHoverCard}
          onFocus={() => onFocusBlock?.(appointment.id)}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setPopoverOpen(true)
            }
          }}
        >
          {/* TOP resize handle — 24px hit area (tylko dla bloków ≥48px, żeby nie przykrywać krótkich wizyt) */}
          {heightPx >= 48 && (
            <div
              className="absolute -top-3 left-0 right-0 z-10 h-6 cursor-n-resize touch-none"
              onPointerDown={(e) => {
                e.stopPropagation()
                onResizeTopStart(appointment.id, e)
              }}
              onClick={(e) => e.stopPropagation()}
              aria-hidden="true"
            />
          )}

          {/* Pionowy pasek koloru zabiegu wzdłuż osi czasu */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 rounded-l-md"
            style={{ backgroundColor: isCancelled ? undefined : tint.solid }}
          />

          {/* Main drag area — touch-none, aby długie przytrzymanie uruchamiało
              przeciąganie zamiast przewijania siatki */}
          <div
            {...listeners}
            {...attributes}
            className="h-full cursor-grab touch-none select-none pl-3.5 pr-2 pt-1 pb-[6px] active:cursor-grabbing"
          >
            {isTiny ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.solidClass}`}
                  aria-hidden="true"
                />
                <p
                  className={`text-[11px] tabular-nums font-semibold truncate leading-none ${cfg.timeText}`}
                >
                  {format(startDate, 'HH:mm')}
                </p>
                {staffName && (
                  <span className={`text-[11px] font-bold shrink-0 ${cfg.text}`} aria-hidden="true">
                    {initials}
                  </span>
                )}
              </div>
            ) : isCompact ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`text-[11px] font-bold w-4 h-4 rounded-sm flex items-center justify-center shrink-0 ${color.containerClass}`}
                  aria-hidden="true"
                >
                  {staffName ? initials : '—'}
                </span>
                <span className={`text-[11px] tabular-nums font-medium shrink-0 ${cfg.timeText}`}>
                  {format(startDate, 'HH:mm')}
                </span>
                <p
                  className={`text-xs font-semibold truncate leading-tight ${cfg.text} ${
                    isCancelled ? 'line-through' : ''
                  }`}
                >
                  {appointment.client.name}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-[2px] gap-1">
                  <span className={`text-[11px] tabular-nums font-medium ${cfg.timeText}`}>
                    {format(startDate, 'HH:mm')}–{format(endDate, 'HH:mm')}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100 transition-opacity shrink-0 -mt-0.5 -mr-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          tabIndex={-1}
                          className={`p-2.5 min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-1 rounded-md hover:bg-foreground/10 transition-colors ${cfg.text}`}
                          aria-label={`Opcje wizyty: ${appointment.client.name}`}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {menuContent}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <p
                  className={`text-xs font-bold leading-tight truncate ${cfg.text} ${
                    isCancelled ? 'line-through' : ''
                  }`}
                >
                  {appointment.client.name}
                </p>

                {heightPx >= 60 && (
                  <p className={`text-[11px] leading-tight truncate mt-0.5 ${cfg.subtext}`}>
                    {appointment.treatment.name}
                  </p>
                )}

                {heightPx >= 48 && (
                  <div className="flex items-center gap-1 mt-0.5 min-w-0">
                    <span
                      className={`text-[11px] font-bold w-4 h-4 rounded-sm flex items-center justify-center shrink-0 ${color.containerClass}`}
                      aria-hidden="true"
                    >
                      {staffName ? initials : '—'}
                    </span>
                    <span className={`text-[11px] font-medium truncate ${cfg.subtext}`}>
                      {staffName ?? 'Nieprzypisane'}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* BOTTOM resize handle — 24px hit area (tylko dla bloków ≥48px) */}
          {heightPx >= 48 && (
            <div
              className="absolute -bottom-3 left-0 right-0 z-10 flex h-6 cursor-s-resize touch-none items-center justify-center"
              onPointerDown={(e) => {
                e.stopPropagation()
                onResizeBottomStart(appointment.id, e)
              }}
              onClick={(e) => e.stopPropagation()}
              aria-hidden="true"
            >
              <div className="w-6 h-[2px] rounded-full bg-current opacity-0 group-hover:opacity-30 transition-opacity" />
            </div>
          )}
        </div>
      </AppointmentPopover>

      {hoverCard &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{ left: hoverCard.x, top: hoverCard.y }}
            className="pointer-events-none fixed z-[80] w-64 rounded-md border border-border bg-popover p-3 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tabular-nums text-popover-foreground">
                {format(startDate, 'HH:mm')}–{format(endDate, 'HH:mm')}
              </p>
              <StatusBadge
                status={appointment.status}
                withIcon={false}
                className="px-2 py-0.5 text-[11px]"
              />
            </div>
            <p className="mt-1.5 truncate text-sm font-semibold text-popover-foreground">
              {appointment.client.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {appointment.treatment.name} · {appointment.duration_minutes} min
              {appointment.treatment.price != null ? ` · ${appointment.treatment.price} zł` : ''}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {staffName ?? 'Nieprzypisany pracownik'}
            </p>
            {appointment.notes && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{appointment.notes}</p>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

// ── Drag overlay ─────────────────────────────────────────────────────────────

interface AppointmentDragOverlayProps {
  appointment: CalendarAppointment
  height: number
}

export function AppointmentDragOverlay({ appointment, height }: AppointmentDragOverlayProps) {
  const cfg = BLOCK_CFG[appointment.status]
  const staffName = appointment.staff_member?.name ?? null
  const color = staffColor(appointment.staff_member?.id ?? appointment.staff_id)
  const startDate = parseISO(appointment.start_time)
  const endDate = addMinutes(startDate, appointment.duration_minutes)

  return (
    <div
      style={{ height: `${Math.max(height, 24)}px`, width: '160px' }}
      className={`rounded-md border ${cfg.bg} ${cfg.border} shadow-2xl px-2 pt-1 pointer-events-none overflow-hidden`}
    >
      <div className="flex items-center gap-1">
        <span
          className={`text-[11px] font-bold w-4 h-4 rounded-sm flex items-center justify-center shrink-0 ${color.containerClass}`}
        >
          {staffName ? staffInitials(staffName) : '—'}
        </span>
        <span className={`text-[11px] tabular-nums font-medium ${cfg.timeText}`}>
          {format(startDate, 'HH:mm')}–{format(endDate, 'HH:mm')}
        </span>
      </div>
      <p className={`text-xs font-bold leading-tight truncate ${cfg.text}`}>
        {appointment.client.name}
      </p>
      <p className={`text-[11px] truncate ${cfg.subtext}`}>{appointment.treatment.name}</p>
    </div>
  )
}
