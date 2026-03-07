'use client'

import { useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { format, parseISO, addMinutes } from 'date-fns'
import { MoreVertical, Trash2, Clock, ExternalLink, CalendarCheck } from 'lucide-react'
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
import { PIXELS_PER_MINUTE, SNAP_MINUTES } from './constants'
import type { CalendarAppointment } from '@/actions/appointments'

export const STATUS_CONFIG = {
  scheduled: {
    bg: 'bg-primary/10',
    hoverBg: 'hover:bg-primary/15',
    border: 'border-l-primary',
    dot: 'bg-primary',
    text: 'text-primary',
    subtext: 'text-primary/70',
    label: 'Zaplanowana',
  },
  completed: {
    bg: 'bg-success/10',
    hoverBg: 'hover:bg-success/15',
    border: 'border-l-success',
    dot: 'bg-success',
    text: 'text-success',
    subtext: 'text-success/70',
    label: 'Zakończona',
  },
  cancelled: {
    bg: 'bg-muted/40',
    hoverBg: 'hover:bg-muted/60',
    border: 'border-l-muted-foreground/30',
    dot: 'bg-muted-foreground/40',
    text: 'text-muted-foreground/70',
    subtext: 'text-muted-foreground/50',
    label: 'Anulowana',
  },
  pending_forms: {
    bg: 'bg-accent/10',
    hoverBg: 'hover:bg-accent/15',
    border: 'border-l-accent',
    dot: 'bg-accent',
    text: 'text-accent-foreground',
    subtext: 'text-accent-foreground/70',
    label: 'Oczekuje na ankietę',
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
  const isCompact = heightPx < 44
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
    left: `calc(${layout.left * 100}% + 1px)`,
    width: `calc(${layout.width * 100}% - 2px)`,
    opacity: isDragging ? 0.2 : 1,
    zIndex: isDragging ? 0 : 2,
    touchAction: 'none',
  }

  const statusMenuItems = (
    ['scheduled', 'pending_forms', 'completed', 'cancelled'] as const
  ).map((s) => ({ status: s, label: STATUS_CONFIG[s].label }))

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
              group rounded-[5px] border-l-[3px] ${cfg.bg} ${cfg.border} ${cfg.hoverBg}
              transition-colors duration-100 overflow-visible
              ${appointment.status === 'cancelled' ? 'opacity-50' : ''}
            `}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
          >
            {/* TOP resize handle */}
            <div
              className="absolute top-0 left-0 right-0 h-[5px] cursor-n-resize z-10 group/top"
              onPointerDown={(e) => {
                e.stopPropagation()
                onResizeTopStart(appointment.id, e)
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-current opacity-0 group-hover/top:opacity-30 transition-opacity" />
            </div>

            {/* Main drag area */}
            <div
              {...listeners}
              {...attributes}
              className="h-full px-1.5 pb-[5px] pt-0.5 cursor-grab active:cursor-grabbing select-none"
            >
              {isTiny ? (
                <p className={`text-[10px] font-semibold truncate leading-tight ${cfg.text}`}>
                  {appointment.client.name}
                </p>
              ) : isCompact ? (
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                  <p className={`text-[11px] font-semibold truncate leading-tight ${cfg.text}`}>
                    {appointment.client.name}
                  </p>
                  <span className={`ml-auto text-[10px] shrink-0 ${cfg.subtext}`}>
                    {format(startDate, 'HH:mm')}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-1 mb-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-[3px] ${cfg.dot}`} />
                    <p className={`text-[11px] font-bold leading-tight flex-1 truncate ${cfg.text}`}>
                      {appointment.client.name}
                    </p>
                    {/* Three-dots dropdown — visible on hover */}
                    <div
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5 -mr-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`p-0.5 rounded hover:bg-black/10 transition-colors ${cfg.text}`}
                            aria-label="Opcje wizyty"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Clock className="w-3.5 h-3.5 mr-2" />
                              Zmień status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {statusMenuItems.map(({ status, label }) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => onStatusChange(appointment.id, status)}
                                  className={`gap-2 ${appointment.status === status ? 'font-medium' : ''}`}
                                >
                                  <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dot}`} />
                                  {label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a href={`/dashboard/visits/${appointment.id}`}>
                              <ExternalLink className="w-3.5 h-3.5 mr-2" />
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className={`text-[10px] leading-tight truncate pl-2.5 ${cfg.subtext}`}>
                    {appointment.treatment.name}
                  </p>
                  {heightPx >= 56 && (
                    <p className={`text-[10px] leading-tight pl-2.5 mt-0.5 tabular-nums ${cfg.subtext}`}>
                      {format(startDate, 'HH:mm')}–{format(endDate, 'HH:mm')}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* BOTTOM resize handle */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[5px] cursor-s-resize z-10 group/bottom"
              onPointerDown={(e) => {
                e.stopPropagation()
                onResizeBottomStart(appointment.id, e)
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-current opacity-0 group-hover/bottom:opacity-30 transition-opacity" />
            </div>
          </div>
        </AppointmentPopover>
      </ContextMenuTrigger>

      {/* Right-click context menu */}
      <ContextMenuContent className="w-56">
        <ContextMenuLabel className="text-xs text-muted-foreground font-normal">
          {appointment.client.name}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <CalendarCheck className="w-3.5 h-3.5 mr-2" />
            Zmień status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {statusMenuItems.map(({ status, label }) => (
              <ContextMenuItem
                key={status}
                onClick={() => onStatusChange(appointment.id, status)}
                className={`gap-2 ${appointment.status === status ? 'font-semibold' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dot}`} />
                {label}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem asChild>
          <a href={`/dashboard/visits/${appointment.id}`}>
            <ExternalLink className="w-3.5 h-3.5 mr-2" />
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

// ── Drag overlay (floating clone while dragging) ─────────────────────────────

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
      style={{ height: `${Math.max(height, 24)}px`, width: '180px' }}
      className={`rounded-[5px] border-l-[3px] ${cfg.bg} ${cfg.border} shadow-2xl ring-2 ring-primary/20 px-1.5 pt-0.5 pointer-events-none`}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        <p className={`text-[11px] font-bold leading-tight truncate ${cfg.text}`}>
          {appointment.client.name}
        </p>
      </div>
      <p className={`text-[10px] leading-tight truncate pl-2.5 ${cfg.subtext}`}>
        {appointment.treatment.name}
      </p>
      <p className={`text-[10px] pl-2.5 mt-0.5 tabular-nums ${cfg.subtext}`}>
        {format(startDate, 'HH:mm')} – {format(endDate, 'HH:mm')}
      </p>
    </div>
  )
}
