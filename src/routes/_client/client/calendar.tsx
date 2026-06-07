import { createFileRoute } from '@tanstack/react-router'
import { getClientAppointmentsFn } from '@/src/server/client-portal-data'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

export const Route = createFileRoute('/_client/client/calendar')({
  loader: async () => {
    return await getClientAppointmentsFn()
  },
  component: ClientCalendarPage,
})

const statusLabels: Record<string, string> = {
  scheduled: 'Zaplanowana',
  pending_forms: 'Wymaga formularzy',
  completed: 'Zakończona',
  cancelled: 'Anulowana',
}

function ClientCalendarPage() {
  const { appointments, error } = Route.useLoaderData()

  if (error === 'no_client') {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-foreground">Brak powiązanego profilu klienta.</h2>
        <p className="text-muted-foreground text-sm mt-1">Skontaktuj się z gabinetem.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">Moje wizyty</h1>
        <p className="text-muted-foreground text-sm mt-1">Nadchodzące terminy</p>
      </div>

      {!appointments || appointments.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground">Brak nadchodzących wizyt.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt: any) => (
            <div key={apt.id} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{apt.treatments?.name ?? 'Zabieg'}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {format(parseISO(apt.start_time), 'EEEE, d MMMM yyyy · HH:mm', { locale: pl })}
                  </p>
                  {apt.treatments?.duration_minutes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{apt.treatments.duration_minutes} min</p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {statusLabels[apt.status] ?? apt.status}
                </span>
              </div>
              {apt.notes && (
                <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">{apt.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
