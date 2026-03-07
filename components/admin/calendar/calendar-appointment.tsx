'use client'

import { useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { format, parseISO, addMinutes } from 'date-fns'
import { MoreHorizontal, Trash2, ExternalLink, CalendarCheck } from 'lucide-react'
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuLabel,
} from '@/components/ui/context-menu'
import { AppointmentPopover } from './appointment-popover'
import { PIXELS_PER_MINUTE } from './constants'
import type { CalendarAppointment } from '@/actions/appointments'

export const STATUS_CONFIG = {
  scheduled: {
    bg: 'bg-primary/[0.10]',
    ring: 'ring-primary/20',
    topBorder: 'border-t-primary',
    badgeBg: 'bg-primary',
    text: 'text-primary',
    subtext: 'text-primary/65',
    timeText: 'text-primary/80',
    label: 'Zaplanowana',
    shortLabel: 'Zap.',
  },
  completed: {
    bg: 'bg-emerald-500/[0.09]',
    ring: 'ring-emerald-500/20',
    topBorder: 'border-t-emerald-500',
    badgeBg: 'bg-emerald-500',
    text: 'text-emerald-700',
    subtext: 'text-emerald-700/65',
    timeText: 'text-emerald-700/80',
    label: 'Zakończona',
    shortLabel: 'Zak.',
  },
  cancelled: {
    bg: 'bg-muted/[0.50]',
    ring: 'ring-border',
    topBorder: 'border-t-muted-foreground/40',
    badgeBg: 'bg-muted-foreground/50',
    text: 'text-muted-foreground/60',
    subtext: 'text-muted-foreground/45',
    timeText: 'text-muted-foreground/50',
    label: 'Anulowana',
    shortLabel: 'Anu.',
  },
  pending_forms: {
    bg: 'bg-amber-500/[0.10]',
    ring: 'ring-amber-500/20',
    topBorder: 'border-t-amber-500',
    badgeBg: 'bg-amber-500',
    text: 'text-amber-700',
    subtext: 'text-amber-700/65',
    timeText: 'text-amber-700/80',
    label: 'Oczekuje na ankietę',
    shortLabel: 'Ank.',
  },
} as const

export interface AppointmentLayoutInfo {
  top: number
  height: number
  left: number   // 0–1 fraction of column width
  width: number  // 0–1 fraction of column width
}

interface CalendarAppointmentBlockProps {
  appointment: CalendarAppointment
  layout: AppointmentLayoutInfo
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CalendarAppointment['status']) => void
  onResizeBottomStart: (id: string, e: React.PointerEvent) => void
  onResizeTopStart: (id: string, e: React.PointerEvent) => void
}

export function CalendarAppointmentBlock({
  appointment,
  layout,
  onDelete,
  onStatusChange,
  onResizeBottomStart,
  onResizeTopStart,
}: CalendarAppointmentBlockProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const pointerDownRef = useRef({ x: 0, y: 0 })

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
  })

  const cfg = STATUS_CONFIG[appointment.status]
  const startDate = parseISO(appointment.start_time)
  const endDate = addMinutes(startDate, appointment.duration_minutes)
  const heightPx = Math.max(layout.height, 20)
  const isCompact = heightPx < 48
  const isTiny = heightPx < 28

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY }
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
    opacity: isDragging ? 0.15 : appointment.status === 'cancelled' ? 0.45 : 1,
    zIndex: isDragging ? 0 : 2,
    touchAction: 'none',
    transform: transform ? CSS.Translate.toString(transform) : undefined,
  }

  const statusMenuItems = (
    ['scheduled', 'pending_forms', 'completed', 'cancelled'] as const
  ).map((s) => ({ status: s, label: STATUS_CONFIG[s].label }))

  const menuContent = (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <CalendarCheck className="w-3.5 h-3.5 mr-2 opacity-70" />
          Zmień status
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {statusMenuItems.map(({ status, label }) => (
            <DropdownMenuItem
              key={status}
              onClick={() => onStatusChange(appointment.id, status)}
              className={`gap-2 ${appointment.status === status ? 'font-semibold' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].badgeBg}`} />
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <AppointmentPopover
          appointment={appointment}
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
        >
          <div
            ref={setNodeRef}
            style={blockStyle}
            className={`
              group rounded-xl border-t-[3px] ${cfg.bg} ${cfg.topBorder}
              ring-1 ${cfg.ring}
              hover:ring-2 hover:shadow-md
              transition-shadow duration-150 overflow-hidden
            `}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
          >
            {/* TOP resize handle */}
            <div
              className="absolute top-0 left-0 right-0 h-[6px] cursor-n-resize z-10"
              onPointerDown={(e) => {
                e.stopPropagation()
                onResizeTopStart(appointment.id, e)
              }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Main drag area */}
            <div
              {...listeners}
              {...attributes}
              className="h-full cursor-grab active:cursor-grabbing select-none px-2 pt-1 pb-[6px]"
            >
              {isTiny ? (
                // Tiny: just time
                <p className={`text-[9px] tabular-nums font-semibold truncate leading-none ${cfg.timeText}`}>
                  {format(startDate, 'HH:mm')}
                </p>
              ) : isCompact ? (
                // Compact: time + client name inline
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[9px] tabular-nums font-medium shrink-0 ${cfg.timeText}`}>
                    {format(startDate, 'HH:mm')}
                  </span>
                  <p className={`text-[11px] font-semibold truncate leading-tight ${cfg.text}`}>
                    {appointment.client.name}
                  </p>
                </div>
              ) : (
                // Full: time row, client name, treatment
                <>
                  {/* Time row + three-dots */}
                  <div className="flex items-center justify-between mb-[2px]">
                    <span className={`text-[9px] tabular-nums font-medium ${cfg.timeText}`}>
                      {format(startDate, 'HH:mm')}–{format(endDate, 'HH:mm')}
                    </span>
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`p-0.5 rounded-md hover:bg-black/10 transition-colors ${cfg.text}`}
                            aria-label="Opcje wizyty"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {menuContent}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Client name */}
                  <p className={`text-[12px] font-bold leading-tight truncate ${cfg.text}`}>
                    {appointment.client.name}
                  </p>

                  {/* Treatment */}
                  {heightPx >= 60 && (
                    <p className={`text-[10px] leading-tight truncate mt-0.5 ${cfg.subtext}`}>
                      {appointment.treatment.name}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* BOTTOM resize handle */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[6px] cursor-s-resize z-10 flex items-end justify-center pb-[2px]"
              onPointerDown={(e) => {
                e.stopPropagation()
                onResizeBottomStart(appointment.id, e)
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-6 h-[2px] rounded-full bg-current opacity-0 group-hover:opacity-20 transition-opacity" />
            </div>
          </div>
        </AppointmentPopover>
      </ContextMenuTrigger>

      {/* Right-click context menu */}
      <ContextMenuContent className="w-56">
        <ContextMenuLabel className="text-xs text-muted-foreground font-normal truncate">
          {appointment.client.name}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <CalendarCheck className="w-3.5 h-3.5 mr-2 opacity-70" />
            Zmień status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {statusMenuItems.map(({ status, label }) => (
              <ContextMenuItem
                key={status}
                onClick={() => onStatusChange(appointment.id, status)}
                className={`gap-2 ${appointment.status === status ? 'font-semibold' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].badgeBg}`} />
                {label}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem asChild>
          <a href={`/dashboard/visits/${appointment.id}`}>
            <ExternalLink className="w-3.5 h-3.5 mr-2 opacity-70" />
            Szczegóły wizyty
          </a>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
          onClick={() => onDelete(appointment.id)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          Usuń wizytę
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ── Drag overlay ─────────────────────────────────────────────────────────────

interface AppointmentDragOverlayProps {
  appointment: CalendarAppointment
  height: number
}

export function AppointmentDragOverlay({ appointment, height }: AppointmentDragOverlayProps) {
  const cfg = STATUS_CONFIG[appointment.status]
  const startDate = parseISO(appointment.start_time)
  const endDate = addMinutes(startDate, appointment.duration_minutes)

  return (
    <div
      style={{ height: `${Math.max(height, 24)}px`, width: '160px' }}
      className={`rounded-xl border-t-[3px] ${cfg.bg} ${cfg.topBorder} ring-2 ${cfg.ring} shadow-2xl px-2 pt-1 pointer-events-none`}
    >
      <span className={`text-[9px] tabular-nums font-medium block ${cfg.timeText}`}>
        {format(startDate, 'HH:mm')}–{format(endDate, 'HH:mm')}
      </span>
      <p className={`text-[12px] font-bold leading-tight truncate ${cfg.text}`}>
        {appointment.client.name}
      </p>
      <p className={`text-[10px] truncate ${cfg.subtext}`}>
        {appointment.treatment.name}
      </p>
    </div>
  )
}
