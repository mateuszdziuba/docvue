import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClientDetailClient } from '@/components/admin/client-detail-client'
import { EditClientDialog } from '@/components/admin/edit-client-dialog'
import { AddAppointmentDialog } from '@/components/admin/add-appointment-dialog'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user?.id)
    .single()

  // Get client
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('salon_id', salon?.id)
    .single()

  if (error || !client) {
    notFound()
  }

  // Get client's assigned forms
  const { data: clientForms } = await supabase
    .from('client_forms')
    .select(`
      *,
      forms (id, title, description)
    `)
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  // Get all available forms for assignment
  const { data: availableForms } = await supabase
    .from('forms')
    .select('id, title')
    .eq('salon_id', salon?.id)
    .eq('is_active', true)
    .order('title')

  // Get client's submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      forms (title)
    `)
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link 
            href="/dashboard/clients" 
            className="text-purple-600 hover:text-purple-700 text-sm font-medium mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Wróć do listy
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {client.name}
            </h1>
            {client.birth_date && (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
                {(() => {
                  const today = new Date()
                  const birthDate = new Date(client.birth_date)
                  let age = today.getFullYear() - birthDate.getFullYear()
                  const m = today.getMonth() - birthDate.getMonth()
                  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--
                  }
                  return `${age} lat`
                })()}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-500 dark:text-gray-400">
            {client.email && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {client.phone}
              </span>
            )}
            {client.birth_date && (
               <span className="flex items-center gap-1">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
                 {new Date(client.birth_date).toLocaleDateString('pl-PL')}
               </span>
            )}
          </div>

          {client.notes && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap flex gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {client.notes}
              </p>
            </div>
          )}
        </div>
        <EditClientDialog 
          client={client} 
          trigger={
            <button className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-lg transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edytuj
            </button>
          } 
        />
      </div>

      <ClientDetailClient 
        client={client}
        clientForms={clientForms || []}
        availableForms={availableForms || []}
        submissions={submissions || []}
      />

      <div className="mt-8">
         <div className="flex items-center justify-between mb-4">
           <h2 className="text-lg font-bold text-gray-900 dark:text-white">Historia Wizyt</h2>
           <AddAppointmentDialog clientId={client.id} salonId={client.salon_id} />
         </div>
         
         <Suspense fallback={<div>Ładowanie wizyt...</div>}>
           <ClientVisitsList clientId={client.id} />
         </Suspense>
      </div>
    </div>
  )
}

async function ClientVisitsList({ clientId }: { clientId: string }) {
  const supabase = await createClient()
  const { data: visits } = await supabase
    .from('appointments')
    .select(`
      *,
      treatments (name, duration_minutes)
    `)
    .eq('client_id', clientId)
    .order('start_time', { ascending: false })

  if (!visits || visits.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        <p className="text-gray-500">Brak historii wizyt</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {visits.map((visit) => {
        const date = new Date(visit.start_time)
        return (
          <div key={visit.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow">
             <div className="flex items-center gap-4">
               <div className="flex flex-col items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-700 dark:text-purple-300">
                 <span className="text-xs font-bold uppercase">{date.toLocaleDateString('pl-PL', { month: 'short' })}</span>
                 <span className="text-lg font-bold">{date.getDate()}</span>
               </div>
               <div>
                 <h3 className="font-semibold text-gray-900 dark:text-white">{visit.treatments?.name}</h3>
                 <p className="text-sm text-gray-500">
                   {date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} • {visit.treatments?.duration_minutes} min
                 </p>
               </div>
             </div>
             
             <div className="flex flex-col items-end gap-2">
               <span className={`px-2.5 py-1 rounded-md text-xs font-medium
                 ${visit.status === 'scheduled' ? 'bg-blue-50 text-blue-700' : ''}
                 ${visit.status === 'completed' ? 'bg-green-50 text-green-700' : ''}
                 ${visit.status === 'cancelled' ? 'bg-red-50 text-red-700' : ''}
                 ${visit.status === 'pending_forms' ? 'bg-orange-50 text-orange-700 border border-orange-100' : ''}
               `}>
                 {visit.status === 'pending_forms' ? 'Wymaga ankiety' : 
                  visit.status === 'scheduled' ? 'Zaplanowana' : 
                  visit.status === 'completed' ? 'Zakończona' : visit.status}
               </span>
               <a href={`/dashboard/visits/${visit.id}`} className="text-sm text-gray-400 hover:text-purple-600">
                 Szczegóły &rarr;
               </a>
             </div>
          </div>
        )
      })}
    </div>
  )
}
