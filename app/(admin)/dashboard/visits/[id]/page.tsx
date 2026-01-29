import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { PhotoUpload } from '@/components/admin/photo-upload'
import { VisitStatusSelect } from '@/components/admin/visit-status-select'
import { VisitNotes } from '@/components/admin/visit-notes'
import { DeleteVisitButton } from '@/components/admin/delete-visit-button'
import { PhotoComparison } from '@/components/admin/photo-comparison'
import { FillVisitFormButton } from '@/components/admin/fill-visit-form-button'
import { SubmissionPreviewDialog } from '@/components/admin/submission-preview-dialog'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminVisitDetailsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: appointment } = await supabase
    .from('appointments')
    .select(`
      *,
      treatments (
        *,
        treatment_forms (
          forms (id, title)
        )
      ),
      clients (*)
    `)
    .eq('id', id)
    .single()

  if (!appointment) notFound()

  // Fetch client submissions to check status
  const { data: clientSubmissions } = await supabase
    .from('submissions')
    .select('*, forms(id, title, schema)')
    .eq('client_id', appointment.client_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/dashboard/clients/${appointment.client_id}`} className="hover:text-gray-900">
          Klient: {appointment.clients.name}
        </Link>
        <span>/</span>
        <span>Wizyta</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
             {appointment.treatments.name}
           </h1>
           <p className="text-gray-500 mt-1">
             {format(new Date(appointment.start_time), 'EEEE, d MMMM yyyy, HH:mm', { locale: pl })}
             {' • '}{appointment.treatments.duration_minutes} min
           </p>
        </div>
        
        <div className="flex items-center gap-3">
          <VisitStatusSelect 
            id={appointment.id} 
            currentStatus={appointment.status} 
          />
          <DeleteVisitButton visitId={appointment.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details & Notes */}
        <div className="md:col-span-2 space-y-6">
           <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-4">Notatki z wizyty</h3>
              <VisitNotes id={appointment.id} initialNotes={appointment.notes} />
           </div>

           <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-4">Wymagane formularze</h3>
              {appointment.treatments?.treatment_forms && appointment.treatments.treatment_forms.length > 0 ? (
                <ul className="space-y-3">
                  {appointment.treatments.treatment_forms.map((tf: any) => {
                    const formId = tf.forms.id;
                    // Find latest submission for this form
                    const submission = clientSubmissions?.find((s: any) => s.form_id === formId);
                    
                    return (
                    <li key={formId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-3 text-sm font-medium">
                        {submission ? (
                             <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        ) : (
                             <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        )}
                        <span className={submission ? 'text-gray-900 line-through decoration-gray-400' : 'text-gray-900'}>
                            {tf.forms.title}
                        </span>
                      </div>
                      
                      {submission ? (
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-green-600 font-medium hidden sm:inline-block">Wypełniono</span>
                             <SubmissionPreviewDialog 
                                submission={submission}
                                trigger={
                                    <button className="text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-gray-600">
                                        Podgląd
                                    </button>
                                }
                             />
                          </div>
                      ) : (
                        <FillVisitFormButton 
                            clientId={appointment.client_id}
                            formId={formId}
                            formTitle={tf.forms.title}
                        />
                      )}
                    </li>
                  )})}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">Brak wymaganych formularzy.</p>
              )}
           </div>
        </div>

        {/* Right Column: Photos */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
             <h3 className="text-lg font-bold mb-4">Zdjęcia</h3>
             <div className="flex flex-col gap-6">
               <PhotoUpload 
                 visitId={appointment.id} 
                 type="before" 
                 initialPath={appointment.before_photo_path} 
               />
               <div className="w-full h-px bg-gray-100 dark:bg-gray-700" />
               <PhotoUpload 
                  visitId={appointment.id} 
                  type="after" 
                  initialPath={appointment.after_photo_path} 
               />
             </div>
             <PhotoComparison 
                beforePath={appointment.before_photo_path} 
                afterPath={appointment.after_photo_path} 
             />
          </div>
        </div>
      </div>
    </div>
  )
}
