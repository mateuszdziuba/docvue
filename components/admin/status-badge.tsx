import type { LucideIcon } from 'lucide-react'
import { BadgeCheck, CalendarClock, CircleSlash, FileWarning } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AppointmentStatus = 'scheduled' | 'pending_forms' | 'completed' | 'cancelled'

export interface StatusConfig {
  label: string
  icon: LucideIcon
  badgeClass: string
  dotClass: string
  blockClass: string
}

export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  scheduled: {
    label: 'Zaplanowana',
    icon: CalendarClock,
    badgeClass: 'bg-info-container text-on-info-container border-info/25',
    dotClass: 'bg-info',
    blockClass: 'border-info/45',
  },
  pending_forms: {
    label: 'Czeka na formularz',
    icon: FileWarning,
    badgeClass: 'bg-warning-container text-on-warning-container border-warning/35',
    dotClass: 'bg-warning',
    blockClass: 'border-warning/60',
  },
  completed: {
    label: 'Zakończona',
    icon: BadgeCheck,
    badgeClass: 'bg-success-container text-on-success-container border-success/30',
    dotClass: 'bg-success',
    blockClass: 'border-success/50',
  },
  cancelled: {
    label: 'Odwołana',
    icon: CircleSlash,
    badgeClass: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground',
    blockClass: 'border-border',
  },
}

export function StatusBadge({
  status,
  className,
  withIcon = true,
}: {
  status: AppointmentStatus
  className?: string
  withIcon?: boolean
}) {
  const config = APPOINTMENT_STATUS_CONFIG[status]
  const Icon = config.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        config.badgeClass,
        className,
      )}
    >
      {withIcon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      {config.label}
    </span>
  )
}
