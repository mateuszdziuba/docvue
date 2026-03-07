'use client'

import { format, parseISO, addMinutes } from 'date-fns'
import { pl } from 'date-fns/locale'
import { ExternalLink, Clock, User, Scissors } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import Link from 'next/link'
import type { CalendarAppointment } from '@/actions/appointments'

const statusLabels: Record<CalendarAppointment['status'], string> = {
  scheduled: 'Zaplanowana',
  completed: 'Zakończona',
  cancelled: 'Anulowana',
  pending_forms: 'Oczekuje na ankietę',
}

const statusClasses: Record<CalendarAppointment['status'], string> = {
  scheduled: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
  pending_forms: 'bg-accent/10 text-accent-foreground',
}

interface AppointmentPopoverProps {
  appointment: CalendarAppointment
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppointmentPopover({
  appointment,
  children,
  open,
  onOpenChange,
}: AppointmentPopoverProps) {
  const startDate = parseISO(appointment.start_time)
  const endDate = addMinutes(startDate, appointment.duration_minutes)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 shadow-xl"
        side="right"
        align="start"
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
              {appointment.client.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm leading-tight truncate">
                {appointment.client.name}
              </p>
              {appointment.client.phone && (
                <p className="text-xs text-muted-foreground mt-0.5">{appointment.client.phone}</p>
              )}
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusClasses[appointment.status]}`}
            >
              {statusLabels[appointment.status]}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Scissors className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{appointment.treatment.name}</span>
            {appointment.treatment.price != null && (
              <span className="ml-auto text-muted-foreground text-xs">
                {appointment.treatment.price} PLN
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <span className="text-foreground">
                {format(startDate, 'EEEE, d MMMM', { locale: pl })}
              </span>
              <br />
              <span className="text-muted-foreground">
                {format(startDate, 'HH:mm')} – {format(endDate, 'HH:mm')}{' '}
                <span className="text-xs">({appointment.duration_minutes} min)</span>
              </span>
            </div>
          </div>

          {appointment.notes && (
            <div className="bg-secondary/60 rounded-lg p-2.5">
              <p className="text-xs text-muted-foreground leading-relaxed">{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <Link
            href={`/dashboard/visits/${appointment.id}`}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            onClick={() => onOpenChange(false)}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Szczegóły wizyty
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
