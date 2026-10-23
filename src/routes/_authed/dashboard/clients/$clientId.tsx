import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ScanFace } from 'lucide-react'
import { BeautyPlanSection } from '@/components/admin/beauty-plan-section'
import { ClientDetailClient } from '@/components/admin/client-detail-client'
import { ConsultationHistoryCard } from '@/components/admin/consultation/consultation-history'
import { ConsultationRecommendationsCard } from '@/components/admin/consultation/consultation-recommendations'
import { Button } from '@/components/ui/button'
import { getAppointmentsFn } from '@/src/server/appointments'
import { getClientFormsFn } from '@/src/server/client-forms'
import { getClientFn } from '@/src/server/clients'
import { listConsultationsFn } from '@/src/server/consultations'
import { getFormsFn } from '@/src/server/forms'
import { getSalonFn } from '@/src/server/settings'
import { getStaffFn } from '@/src/server/staff'
import { getSubmissionsFn } from '@/src/server/submissions'
import { getTreatmentsFn } from '@/src/server/treatments'

export const Route = createFileRoute('/_authed/dashboard/clients/$clientId')({
  loader: async ({ params }) => {
    const [
      clientRes,
      clientFormsRes,
      formsRes,
      appointmentsRes,
      submissionsRes,
      consultationsRes,
      treatmentsRes,
      salon,
      staffRes,
    ] = await Promise.all([
      getClientFn({ data: { id: params.clientId } }),
      getClientFormsFn({ data: { clientId: params.clientId } }),
      getFormsFn(),
      getAppointmentsFn({ data: {} }),
      getSubmissionsFn({ data: { clientId: params.clientId } }),
      listConsultationsFn({ data: { clientId: params.clientId } }),
      getTreatmentsFn({ data: {} }),
      getSalonFn(),
      getStaffFn(),
    ])

    if (clientRes.error || !clientRes.client) throw notFound()

    return {
      client: clientRes.client,
      clientForms: clientFormsRes.clientForms,
      availableForms: formsRes.forms,
      submissions: submissionsRes.submissions,
      appointments: (appointmentsRes.appointments as any[]).filter(
        (a: any) => a.client_id === params.clientId,
      ),
      consultations: consultationsRes.consultations,
      consultationsError: consultationsRes.error,
      treatments: treatmentsRes.treatments,
      salonId: salon?.id ?? '',
      staffMembers: (staffRes.data ?? [])
        .filter((member) => member.is_active)
        .map((member) => ({ id: member.id, name: member.name })),
    }
  },
  component: ClientDetailPage,
})

function ClientDetailPage() {
  const {
    client,
    clientForms,
    availableForms,
    submissions,
    appointments,
    consultations,
    consultationsError,
    treatments,
    salonId,
    staffMembers,
  } = Route.useLoaderData()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Link
            to="/dashboard/clients"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            ← Klienci
          </Link>
          <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">
            {client.name}
          </h1>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/dashboard/clients/$clientId/consultations" params={{ clientId: client.id }}>
            <ScanFace className="h-4 w-4" aria-hidden="true" />
            Konsultacja
          </Link>
        </Button>
      </div>

      <ClientDetailClient
        client={client}
        clientForms={clientForms ?? []}
        availableForms={availableForms ?? []}
        submissions={
          (submissions ?? []) as unknown as (import('@/types/database').Submission & {
            forms: { title: string }
          })[]
        }
        appointments={appointments}
      />

      <ConsultationHistoryCard
        clientId={client.id}
        consultations={consultations ?? []}
        error={consultationsError}
        limit={3}
      />

      <ConsultationRecommendationsCard
        clientId={client.id}
        clientName={client.name}
        consultations={consultations ?? []}
        treatments={treatments ?? []}
        salonId={salonId}
        staffMembers={staffMembers}
      />

      <BeautyPlanSection clientId={client.id} clientEmail={client.email} />
    </div>
  )
}
