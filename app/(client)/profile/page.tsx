import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

export default async function ClientProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: client } = await supabase.from('clients').select('*').eq('user_id', user.id).single()

  if (!client) return <div className="text-foreground">Nie znaleziono profilu</div>

  const { data: history } = await supabase
    .from('appointments')
    .select(`
      *,
      treatments (name)
    `)
    .eq('client_id', client.id)
    .order('start_time', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-xl p-6 border border-border/60 flex items-center gap-4">
        <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
          {client.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{client.name}</h1>
          <p className="text-muted-foreground text-sm">{client.email}</p>
          <p className="text-muted-foreground text-sm">{client.phone}</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Historia wizyt</h2>
        <div className="bg-card rounded-xl overflow-hidden border border-border/60">
          {history && history.length > 0 ? (
            <div className="divide-y divide-border/60">
              {history.map((apt) => (
                <div key={apt.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-foreground text-sm">{apt.treatments?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(apt.start_time), 'd MMMM yyyy, HH:mm', { locale: pl })}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                    apt.status === 'completed' ? 'bg-[hsl(150,45%,45%)]/10 text-[hsl(150,45%,45%)]' : 
                    apt.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
             <div className="p-6 text-center text-muted-foreground text-sm">Brak historii wizyt</div>
          )}
        </div>
      </div>
    </div>
  )
}
