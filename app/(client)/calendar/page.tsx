import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

export default async function ClientCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: client } = await supabase.from('clients').select('id').eq('user_id', user.id).single()

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-foreground">Brak powiązanego profilu klienta.</h2>
        <p className="text-muted-foreground text-sm">Skontaktuj się z gabinetem.</p>
      </div>
    )
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      status,
      treatments (
        name, 
        duration_minutes,
        treatment_forms (form_id)
      )
    `)
    .eq('client_id', client.id)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  const { data: submissions } = await supabase
    .from('submissions')
    .select('form_id')
    .eq('client_id', client.id)

  const submittedFormIds = new Set(submissions?.map(s => s.form_id) || [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Nadchodzące wizyty</h1>
      
      {appointments && appointments.length > 0 ? (
        <div className="grid gap-3">
          {appointments.map((apt) => {
            const date = new Date(apt.start_time)
            const treatmentForms = (apt.treatments as any)?.treatment_forms || []
            const requiredFormIds = treatmentForms.map((tf: any) => tf.form_id)
            const needsForm = requiredFormIds.some((id: string) => !submittedFormIds.has(id))
            
            return (
              <Link 
                key={apt.id} 
                href={`/visits/${apt.id}`}
                className="block bg-card rounded-xl p-5 border border-border/60 hover:border-border transition-colors relative overflow-hidden"
              >
                {needsForm && (
                  <div className="absolute top-0 right-0 p-2.5">
                    <span className="flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/60 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                      {format(date, 'd MMMM yyyy', { locale: pl })}
                    </p>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {(apt.treatments as any)?.name}
                    </h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {format(date, 'HH:mm')} ({(apt.treatments as any)?.duration_minutes} min)
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                     <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide
                       ${apt.status === 'scheduled' ? 'bg-[hsl(220,50%,50%)]/10 text-[hsl(220,50%,50%)]' : ''}
                       ${apt.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : ''}
                       ${apt.status === 'completed' ? 'bg-[hsl(150,45%,45%)]/10 text-[hsl(150,45%,45%)]' : ''}
                       ${apt.status === 'pending_forms' ? 'bg-accent/10 text-accent-foreground' : ''}
                     `}>
                       {apt.status === 'scheduled' ? 'Zaplanowana' : 
                        apt.status === 'pending_forms' ? 'Wymaga ankiety' : apt.status}
                     </span>
                     
                     {needsForm && (
                       <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                         </svg>
                         Wymagany formularz
                       </span>
                     )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
           <svg className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>
           <h3 className="font-medium text-foreground">Brak nadchodzących wizyt</h3>
           <p className="text-muted-foreground text-sm">Kiedy umówisz się na wizytę, zobaczysz ją tutaj.</p>
        </div>
      )}
    </div>
  )
}
