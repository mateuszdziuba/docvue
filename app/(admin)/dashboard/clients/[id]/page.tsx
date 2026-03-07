import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClientDetailClient } from '@/components/admin/client-detail-client'
import { EditClientDialog } from '@/components/admin/edit-client-dialog'
import { AddAppointmentDialog } from '@/components/admin/add-appointment-dialog'
import { BeautyPlanSection } from '@/components/admin/beauty-plan-section'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

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

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('salon_id', salon?.id)
    .single()

  if (error || !client) {
    notFound()
  }

  const [
    { data: clientForms },
    { data: availableForms },
    { data: submissions },
    { count: visitCount },
  ] = await Promise.all([
    supabase
      .from('client_forms')
      .select('*, forms (id, title, description)')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('forms')
      .select('id, title')
      .eq('salon_id', salon?.id)
      .eq('is_active', true)
      .order('title'),
    supabase
      .from('submissions')
      .select('*, forms (title)')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id),
  ])

  const age = client.birth_date ? (() => {
    const today = new Date()
    const birthDate = new Date(client.birth_date)
    let a = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--
    return a
  })() : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/dashboard/clients"
            className="text-primary hover:text-primary/80 text-sm font-medium mb-2 inline-flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Wróć do listy
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">
              {client.name}
            </h1>
            {age !== null && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {age} lat
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground text-sm">
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
            <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <p className="text-sm text-accent-foreground whitespace-pre-wrap flex gap-2">
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
            <button className="px-4 py-2 text-sm font-medium text-primary bg-primary/8 hover:bg-primary/12 rounded-lg transition-colors flex items-center gap-2 shrink-0">
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
        <Suspense fallback={<div className="h-48 rounded-2xl bg-secondary animate-pulse" />}>
          <BeautyPlanSection clientId={client.id} salonId={client.salon_id} />
        </Suspense>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Historia Wizyt</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium border border-border">
              {visitCount || 0}
            </span>
          </div>
          <AddAppointmentDialog clientId={client.id} salonId={client.salon_id} />
        </div>

        <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
          <ClientVisitsList clientId={client.id} />
        </Suspense>
      </div>
    </div>
  )
}

const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Zaplanowana', className: 'bg-info/10 text-info' },
  completed: { label: 'Zakończona', className: 'bg-success/10 text-success' },
  cancelled: { label: 'Anulowana', className: 'bg-destructive/10 text-destructive' },
  pending_forms: { label: 'Wymaga ankiety', className: 'bg-accent/10 text-accent-foreground' },
}

async function ClientVisitsList({ clientId }: { clientId: string }) {
  const supabase = await createClient()
  const { data: visits } = await supabase
    .from('appointments')
    .select('*, treatments (name, duration_minutes)')
    .eq('client_id', clientId)
    .order('start_time', { ascending: false })

  if (!visits || visits.length === 0) {
    return (
      <div className="text-center py-8 bg-secondary/30 rounded-xl border border-dashed border-border">
        <p className="text-muted-foreground text-sm">Brak historii wizyt</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {visits.map((visit) => {
        const date = new Date(visit.start_time)
        const status = statusConfig[visit.status] ?? { label: visit.status, className: 'bg-secondary text-muted-foreground' }

        return (
          <div key={visit.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/60 hover:border-border transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 rounded-lg text-primary shrink-0">
                <span className="text-xs font-bold uppercase">{date.toLocaleDateString('pl-PL', { month: 'short' })}</span>
                <span className="text-lg font-bold leading-none">{date.getDate()}</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{visit.treatments?.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} • {visit.treatments?.duration_minutes} min
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${status.className}`}>
                {status.label}
              </span>
              <Link href={`/dashboard/visits/${visit.id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Szczegóły &rarr;
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
