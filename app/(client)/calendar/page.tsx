import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

export default async function ClientCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get client details
  const { data: client } = await supabase.from('clients').select('id').eq('user_id', user.id).single()

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">Brak powiązanego profilu klienta.</h2>
        <p className="text-gray-500">Skontaktuj się z gabinetem.</p>
      </div>
    )
  }

  // Get appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      status,
      treatments (name, duration_minutes, required_form_id),
      submissions (id)
    `)
    .eq('client_id', client.id)
    .gte('start_time', new Date().toISOString()) // Upcoming
    .order('start_time', { ascending: true })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nadchodzące wizyty</h1>
      
      {appointments && appointments.length > 0 ? (
        <div className="grid gap-4">
          {appointments.map((apt) => {
            const date = new Date(apt.start_time)
            const needsForm = apt.treatments?.required_form_id && !apt.submission_id
            
            return (
              <Link 
                key={apt.id} 
                href={`/visits/${apt.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {needsForm && (
                  <div className="absolute top-0 right-0 p-2">
                    <span className="flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-1">
                      {format(date, 'd MMMM yyyy', { locale: pl })}
                    </p>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {apt.treatments?.name}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {format(date, 'HH:mm')} ({apt.treatments?.duration_minutes} min)
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                     <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold
                       ${apt.status === 'scheduled' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                       ${apt.status === 'cancelled' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : ''}
                       ${apt.status === 'completed' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : ''}
                     `}>
                       {apt.status === 'scheduled' ? 'Zaplanowana' : apt.status}
                     </span>
                     
                     {needsForm && (
                       <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
           <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>
           <h3 className="text-lg font-medium text-gray-900 dark:text-white">Brak nadchodzących wizyt</h3>
           <p className="text-gray-500">Kiedy umówisz się na wizytę, zobaczysz ją tutaj.</p>
        </div>
      )}
    </div>
  )
}
