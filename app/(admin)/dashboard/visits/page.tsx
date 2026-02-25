import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function VisitsPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: salon } = await supabase.from('salons').select('id').eq('user_id', user?.id).single()

  let query = supabase
    .from('appointments')
    .select(`
      *,
      treatments (name, duration_minutes),
      clients (name)
    `)
    .eq('salon_id', salon?.id)
    .order('start_time', { ascending: false })

  if (q) {
      const { data: matchingClients } = await supabase
          .from('clients')
          .select('id')
          .ilike('name', `%${q}%`)

      const clientIds = matchingClients?.map(c => c.id) || []

      const { data: matchingTreatments } = await supabase
          .from('treatments')
          .select('id')
          .ilike('name', `%${q}%`)

      const treatmentIds = matchingTreatments?.map(t => t.id) || []

      if (clientIds.length > 0 || treatmentIds.length > 0) {
          const conditions = []
          if (clientIds.length > 0) conditions.push(`client_id.in.(${clientIds.join(',')})`)
          if (treatmentIds.length > 0) conditions.push(`treatment_id.in.(${treatmentIds.join(',')})`)
          
          if (conditions.length > 0) {
             query = query.or(conditions.join(','))
          }
      } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000') 
      }
  }

  const { data: visits } = await query

  const filteredVisits = visits

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Wszystkie wizyty</h1>
      </div>

      {/* Search & Filter */}
      <div className="bg-card p-4 rounded-xl border border-border/60">
        <form className="flex gap-2">
          <input 
            name="q" 
            defaultValue={q}
            placeholder="Szukaj po nazwisku klienta lub nazwie zabiegu..." 
            className="flex-1 px-3.5 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all"
          />
          <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Szukaj
          </button>
        </form>
      </div>

      <div className="space-y-2">
        {filteredVisits && filteredVisits.length > 0 ? filteredVisits.map((visit: any) => {
           const date = new Date(visit.start_time)
           return (
             <Link 
               key={visit.id} 
               href={`/dashboard/visits/${visit.id}`}
               className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/60 hover:border-border transition-colors group"
             >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/8 rounded-lg text-primary">
                    <span className="text-[10px] font-bold uppercase">{format(date, 'MMM', { locale: pl })}</span>
                    <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{visit.clients.name}</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                       <span>{visit.treatments?.name}</span>
                       <span className="w-1 h-1 rounded-full bg-border" />
                       <span>{format(date, 'HH:mm')}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide
                    ${visit.status === 'scheduled' ? 'bg-[hsl(220,50%,50%)]/10 text-[hsl(220,50%,50%)]' : ''}
                    ${visit.status === 'completed' ? 'bg-[hsl(150,45%,45%)]/10 text-[hsl(150,45%,45%)]' : ''}
                    ${visit.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : ''}
                    ${visit.status === 'pending_forms' ? 'bg-accent/10 text-accent-foreground' : ''}
                  `}>
                    {visit.status === 'pending_forms' ? 'Wymaga ankiety' : 
                     visit.status === 'scheduled' ? 'Zaplanowana' : 
                     visit.status === 'completed' ? 'Zakończona' : visit.status}
                  </span>
                  <svg className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
             </Link>
           )
        }) : (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
             <p className="text-muted-foreground text-sm">Brak wizyt spełniających kryteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
