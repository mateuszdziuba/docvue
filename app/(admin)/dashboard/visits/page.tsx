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

  // Get current user's salon
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

  // Simple search implementation
  // Note: Complex OR across relations is hard in standard Supabase query without View.
  // For now, if q is present, we'll try to filter by client name using the !inner join hint on clients
  // Simple search implementation
  // Note: We are fetching all (limit logic can be added later) and filtering in JS to handle relation search easily without Views.
  // This ensures searching for "Treatment Name" also works.
  
  const { data: visits } = await query

  // Client-side filtering for treatment name (as a fallback for complex OR query constraints)
  // This is acceptable for smaller datasets, but for production large scale, we should create a View.
  const filteredVisits = q 
    ? visits?.filter((v: any) => 
        v.clients?.name.toLowerCase().includes(q.toLowerCase()) || 
        v.treatments?.name.toLowerCase().includes(q.toLowerCase())
      )
    : visits

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wszystkie wizyty</h1>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <form className="flex gap-2">
          <input 
            name="q" 
            defaultValue={q}
            placeholder="Szukaj po nazwisku klienta lub nazwie zabiegu..." 
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          />
          <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
            Szukaj
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {filteredVisits && filteredVisits.length > 0 ? filteredVisits.map((visit: any) => {
           const date = new Date(visit.start_time)
           return (
             <Link 
               key={visit.id} 
               href={`/dashboard/visits/${visit.id}`}
               className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group"
             >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-14 h-14 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-700 dark:text-purple-300 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition-colors">
                    <span className="text-xs font-bold uppercase">{format(date, 'MMM', { locale: pl })}</span>
                    <span className="text-xl font-bold">{date.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{visit.clients.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                       <span>{visit.treatments?.name}</span>
                       <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                       <span>{format(date, 'HH:mm')}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium
                    ${visit.status === 'scheduled' ? 'bg-blue-50 text-blue-700' : ''}
                    ${visit.status === 'completed' ? 'bg-green-50 text-green-700' : ''}
                    ${visit.status === 'cancelled' ? 'bg-red-50 text-red-700' : ''}
                    ${visit.status === 'pending_forms' ? 'bg-orange-50 text-orange-700' : ''}
                  `}>
                    {visit.status === 'pending_forms' ? 'Wymaga ankiety' : 
                     visit.status === 'scheduled' ? 'Zaplanowana' : 
                     visit.status === 'completed' ? 'Zakończona' : visit.status}
                  </span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
             </Link>
           )
        }) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
             <p className="text-gray-500">Brak wizyt spełniających kryteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
