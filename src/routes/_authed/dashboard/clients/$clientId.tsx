import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { BeautyPlanSection } from '@/components/admin/beauty-plan-section'
import { ClientDetailClient } from '@/components/admin/client-detail-client'
import { getAppointmentsFn } from '@/src/server/appointments'
import { getClientFormsFn } from '@/src/server/client-forms'
import { getClientFn } from '@/src/server/clients'
import { getFormsFn } from '@/src/server/forms'
import { getSubmissionsFn } from '@/src/server/submissions'

export const Route = createFileRoute('/_authed/dashboard/clients/$clientId')({
  loader: async ({ params }) => {
    const [clientRes, clientFormsRes, formsRes, appointmentsRes, submissionsRes] =
      await Promise.all([
        getClientFn({ data: { id: params.clientId } }),
        getClientFormsFn({ data: { clientId: params.clientId } }),
        getFormsFn(),
        getAppointmentsFn({ data: {} }),
        getSubmissionsFn({ data: { clientId: params.clientId } }),
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
    }
  },
  component: ClientDetailPage,
})

function ClientDetailPage() {
  const { client, clientForms, availableForms, submissions, appointments } = Route.useLoaderData()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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

      <BeautyPlanSection clientId={client.id} clientEmail={client.email} />
    </div>
  )
}
