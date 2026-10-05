'use client'

import { Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CalendarX } from 'lucide-react'
import { AddAppointmentDialog } from '@/components/admin/add-appointment-dialog'
import { type AppointmentStatus, StatusBadge } from '@/components/admin/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchInput } from '@/components/ui/search-input'

function normalizeStatus(status: string): AppointmentStatus {
  if (status === 'completed' || status === 'cancelled' || status === 'pending_forms') return status
  return 'scheduled'
}

interface VisitsListProps {
  appointments: any[]
  query: string
  statusFilter: string
}

export function VisitsList({ appointments, query, statusFilter }: VisitsListProps) {
  const filtered = appointments.filter((a) => {
    const matchesQuery =
      !query ||
      a.clients?.name?.toLowerCase().includes(query.toLowerCase()) ||
      a.treatments?.name?.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = !statusFilter || a.status === statusFilter
    return matchesQuery && matchesStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SearchInput placeholder="Szukaj wizyt…" />
        <AddAppointmentDialog />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={<CalendarX className="h-6 w-6" aria-hidden="true" />}
            title="Brak wizyt"
          />
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border divide-y divide-border overflow-hidden">
          {filtered.map((apt) => (
            <Link
              key={apt.id}
              to="/dashboard/visits/$visitId"
              params={{ visitId: apt.id }}
              className="flex items-center justify-between gap-3 p-4 hover:bg-surface-container-low transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">
                  {apt.clients?.name ?? 'Klient'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {apt.treatments?.name ?? 'Zabieg'} ·{' '}
                  {format(parseISO(apt.start_time), 'd MMM yyyy, HH:mm', { locale: pl })}
                </p>
              </div>
              <StatusBadge status={normalizeStatus(apt.status)} className="shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
