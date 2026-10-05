import { createFileRoute, Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CalendarDays, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { getClientAppointmentsFn } from '@/src/server/client-portal-data'

export const Route = createFileRoute('/_client/client/calendar')({
  loader: async () => {
    return await getClientAppointmentsFn()
  },
  component: ClientCalendarPage,
})

interface AppointmentItem {
  id: string
  start_time: string
  status: string
  notes: string | null
  treatments: { name: string | null; duration_minutes: number | null } | null
}

const statusLabels: Record<string, string> = {
  scheduled: 'Zaplanowana',
  pending_forms: 'Wymaga formularzy',
  completed: 'Zakończona',
  cancelled: 'Anulowana',
}

const statusBadge: Record<string, string> = {
  scheduled: 'bg-surface-container text-on-surface-variant',
  pending_forms: 'bg-primary-container text-on-primary-container',
  completed: 'bg-secondary-container text-secondary-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

function NoClientCard() {
  return (
    <Card className="max-w-lg mx-auto w-full flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground/60 mb-5">
        <User className="h-6 w-6" />
      </div>
      <h3 className="font-serif text-lg font-normal text-foreground tracking-tight">
        Brak powiązanego profilu klienta
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
        Nie jesteś jeszcze przypisany do żadnego salonu. Skontaktuj się z gabinetem, aby połączyć
        konto z rezerwacjami.
      </p>
    </Card>
  )
}

function EmptyAppointments() {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground/60 mb-5">
        <CalendarDays className="h-6 w-6" />
      </div>
      <h3 className="font-serif text-lg font-normal text-foreground tracking-tight">
        Brak nadchodzących wizyt
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
        Twój kalendarz jest wolny — to dobry moment, by zadbać o siebie. Umów wizytę w kilka chwil
        przez czat z asystentem.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link to="/client/chat">Umów wizytę przez czat</Link>
      </Button>
    </Card>
  )
}

function ClientCalendarPage() {
  const { appointments, error } = Route.useLoaderData()

  if (error === 'no_client') {
    return (
      <div className="space-y-6">
        <PageHeader title="Moje wizyty" description="Nadchodzące terminy." />
        <NoClientCard />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Moje wizyty" description="Nadchodzące terminy." />

      {!appointments || appointments.length === 0 ? (
        <EmptyAppointments />
      ) : (
        <div className="space-y-3">
          {(appointments as unknown as AppointmentItem[]).map((apt) => (
            <Card key={apt.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{apt.treatments?.name ?? 'Zabieg'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(parseISO(apt.start_time), 'EEEE, d MMMM yyyy · HH:mm', { locale: pl })}
                  </p>
                  {apt.treatments?.duration_minutes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {apt.treatments.duration_minutes} min
                    </p>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={cn('rounded-full shrink-0', statusBadge[apt.status])}
                >
                  {statusLabels[apt.status] ?? apt.status}
                </Badge>
              </div>
              {apt.notes && (
                <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
                  {apt.notes}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
