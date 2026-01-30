import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import Link from 'next/link'
import { ClientFormButton } from './client-form-button'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VisitDetailsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: appointment } = await supabase
    .from('appointments')
    .select(`
      *,
      treatments (
        name,
        description,
        duration_minutes,
        treatment_forms (
          forms (id, title)
        )
      ),
      submissions (id, form_id),
      clients (id, user_id)
    `)
    .eq('id', id)
    .single()

  if (!appointment) notFound()

  // Verify ownership
  if ((appointment.clients as any).user_id !== user.id) {
    return <div>Brak dostępu</div>
  }

  // Calculate missing forms
  const requiredForms = (appointment.treatments as any).treatment_forms?.map((tf: any) => tf.forms) || []
  
  // Fetch latest submissions for the required forms for this client
  const { data: latestSubmissions } = await supabase
    .from('submissions')
    .select('form_id, created_at')
    .eq('client_id', (appointment.clients as any).id)
    .in('form_id', requiredForms.map((f: any) => f?.id || ''))
    .order('created_at', { ascending: false })

  const submittedFormIds = new Set(latestSubmissions?.map(s => s.form_id) || [])
  
  const missingForms = requiredForms.filter((f: any) => f && !submittedFormIds.has(f.id))
  const needsForm = missingForms.length > 0

  return (
    <div className="space-y-6">
      <Link href="/calendar" className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Wróć do kalendarza
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {(appointment.treatments as any).name}
            </h1>
            <p className="text-lg text-pink-600 font-medium">
              {format(new Date(appointment.start_time), 'EEEE, d MMMM yyyy, HH:mm', { locale: pl })}
            </p>
          </div>
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium">
             {(appointment.treatments as any).duration_minutes} min
          </span>
        </div>

        {(appointment.treatments as any).description && (
          <div className="mb-8 prose dark:prose-invert">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">O zabiegu</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {(appointment.treatments as any).description}
            </p>
          </div>
        )}

        <hr className="border-gray-100 dark:border-gray-700 my-6" />

        <div className="mt-8">
           <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
             <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" />
             </svg>
             Wymagane ankiety
           </h3>

           {needsForm ? (
             <div className="space-y-4">
               <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4">
                 <div className="flex items-center gap-3 mb-3">
                   <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                   </div>
                   <h4 className="font-bold text-red-700 dark:text-red-400">
                     Do uzupełnienia ({missingForms.length})
                   </h4>
                 </div>
                 
                 <div className="space-y-3">
                    {missingForms.map((form: any) => (
                      form && (
                        <div key={form.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-100 dark:border-red-900/30">
                          <span className="font-medium text-gray-900 dark:text-white">{form.title}</span>
                          <ClientFormButton 
                             formId={form.id} 
                             variant="sm"
                          />
                        </div>
                      )
                    ))}
                 </div>
               </div>
             </div>
           ) : (
             <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl p-6 flex items-center gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-green-800 dark:text-green-300">Wszystkie ankiety wypełnione</h4>
                  <p className="text-sm text-green-700 dark:text-green-400">Dziękujemy! Twoje dane są aktualne.</p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  )
}
