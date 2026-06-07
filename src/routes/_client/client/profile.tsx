import { createFileRoute, Link } from '@tanstack/react-router'
import { getClientProfileFn } from '@/src/server/client-portal-data'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_client/client/profile')({
  loader: async () => {
    return await getClientProfileFn()
  },
  component: ClientProfilePage,
})

function ClientProfilePage() {
  const { client, history, error } = Route.useLoaderData()

  if (!client) {
    return <div className="text-foreground">Nie znaleziono profilu</div>
  }

  const statusLabel: Record<string, string> = {
    scheduled: 'Zaplanowana',
    pending_forms: 'Oczekuje',
    completed: 'Zakończona',
    cancelled: 'Anulowana',
  }

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-xl p-6 border border-border flex items-center gap-4">
        <div className="h-14 w-14 bg-primary-container rounded-full flex items-center justify-center text-primary text-xl font-bold">
          {(client as any).name.charAt(0)}
        </div>
        <div>
          <h1 className="font-serif text-xl font-normal text-foreground tracking-tight">{(client as any).name}</h1>
          <p className="text-muted-foreground text-sm">{(client as any).email}</p>
          {(client as any).phone && <p className="text-muted-foreground text-sm">{(client as any).phone}</p>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Historia wizyt</h2>
        <div className="bg-card rounded-xl overflow-hidden border border-border">
          {history.length > 0 ? (
            <div className="divide-y divide-border">
              {history.map((apt: any) => (
                <div key={apt.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{apt.treatments?.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(apt.start_time), 'd MMMM yyyy, HH:mm', { locale: pl })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                      apt.status === 'completed' ? 'bg-success/10 text-success' :
                      apt.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {statusLabel[apt.status] || apt.status}
                    </span>
                    {apt.status === 'completed' && (
                      <Link
                        to="/client/chat"
                        className="text-xs text-primary hover:text-primary/80 font-medium whitespace-nowrap transition-colors"
                      >
                        Umów ponownie
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">Brak historii wizyt.</p>
              <Link to="/client/chat" className="inline-block mt-4">
                <Button variant="outline" size="sm">
                  Umów pierwszą wizytę przez czat
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
