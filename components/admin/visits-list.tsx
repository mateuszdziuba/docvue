'use client'

import { Link, useNavigate } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useState } from 'react'
import { AddAppointmentDialog } from '@/components/admin/add-appointment-dialog'

const statusLabels: Record<string, string> = {
  scheduled: 'Zaplanowana',
  pending_forms: 'Oczekuje',
  completed: 'Zakończona',
  cancelled: 'Anulowana',
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  pending_forms: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

interface VisitsListProps {
  appointments: any[]
  query: string
  statusFilter: string
}

export function VisitsList({ appointments, query, statusFilter }: VisitsListProps) {
  const [search, setSearch] = useState(query)
  const navigate = useNavigate()

  const filtered = appointments.filter((a) => {
    const matchesQuery =
      !search ||
      a.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.treatments?.name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || a.status === statusFilter
    return matchesQuery && matchesStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Szukaj wizyt…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        <AddAppointmentDialog />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground">Brak wizyt</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border divide-y divide-border overflow-hidden">
          {filtered.map((apt) => (
            <Link
              key={apt.id}
              to="/dashboard/visits/$visitId"
              params={{ visitId: apt.id }}
              className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">{apt.clients?.name ?? 'Klient'}</p>
                <p className="text-sm text-muted-foreground">
                  {apt.treatments?.name ?? 'Zabieg'} ·{' '}
                  {format(parseISO(apt.start_time), 'd MMM yyyy, HH:mm', { locale: pl })}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[apt.status] ?? 'bg-secondary text-secondary-foreground'}`}>
                {statusLabels[apt.status] ?? apt.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
