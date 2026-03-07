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

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
          forms (id, title, is_active)
        )
      ),
      clients (*)
    `)
    .eq('id', id)
    .single()

  if (!appointment) notFound()

  const { data: clientSubmissions } = await supabase
    .from('submissions')
    .select('*, forms(id, title, schema)')
    .eq('client_id', appointment.client_id)
    .order('created_at', { ascending: false })

  // Auto-sync status based on form completion
  if (appointment.status !== 'completed' && appointment.status !== 'cancelled') {
    const treatmentForms = appointment.treatments?.treatment_forms || []
    const requiredFormIds = treatmentForms.map((tf: any) => tf.forms.id)

    let shouldBeStatus = 'scheduled'

    if (requiredFormIds.length > 0) {
      const submittedFormIds = clientSubmissions?.map((s: any) => s.form_id) || []
      const submittedSet = new Set(submittedFormIds)
      const allMet = requiredFormIds.every((id: string) => submittedSet.has(id))

      if (!allMet) {
        shouldBeStatus = 'pending_forms'
      }
    }

    if (appointment.status !== shouldBeStatus) {
      await supabase
        .from('appointments')
        .update({ status: shouldBeStatus })
        .eq('id', id)

      appointment.status = shouldBeStatus
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/dashboard/clients/${appointment.client_id}`} className="hover:text-foreground transition-colors">
          Klient: {appointment.clients.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Wizyta</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {appointment.treatments.name}
          </h1>
          <p className="text-muted-foreground mt-1">
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
        {/* Left Column: Notes & Forms */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border/60">
            <h3 className="text-base font-semibold text-foreground mb-4">Notatki z wizyty</h3>
            <VisitNotes id={appointment.id} initialNotes={appointment.notes} />
          </div>

          <div className="bg-card rounded-xl p-6 border border-border/60">
            <h3 className="text-base font-semibold text-foreground mb-4">Wymagane formularze</h3>
            {appointment.treatments?.treatment_forms && appointment.treatments.treatment_forms.length > 0 ? (
              <ul className="space-y-2">
                {appointment.treatments.treatment_forms
                  .filter((tf: any) => tf.forms && tf.forms.is_active !== false)
                  .map((tf: any) => {
                    const formId = tf.forms.id
                    const submission = clientSubmissions?.find((s: any) => s.form_id === formId)

                    return (
                      <li key={formId} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg">
                        <div className="flex items-center gap-3 text-sm font-medium">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${submission ? 'bg-success' : 'bg-accent'}`} />
                          <span className={submission ? 'text-muted-foreground line-through decoration-muted-foreground/40' : 'text-foreground'}>
                            {tf.forms.title}
                          </span>
                        </div>

                        {submission ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-success font-medium hidden sm:inline-block">Wypełniono</span>
                            <SubmissionPreviewDialog
                              submission={submission}
                              trigger={
                                <button className="text-xs bg-card border border-border text-foreground px-2 py-1 rounded hover:bg-secondary transition-colors">
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
                    )
                  })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Brak wymaganych formularzy.</p>
            )}
          </div>
        </div>

        {/* Right Column: Photos */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border/60">
            <h3 className="text-base font-semibold text-foreground mb-4">Zdjęcia</h3>
            <div className="grid grid-cols-2 gap-4">
              <PhotoUpload
                visitId={appointment.id}
                type="before"
                initialPath={appointment.before_photo_path}
              />
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
