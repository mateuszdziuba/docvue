import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getClientFn } from '@/src/server/clients'
import { getClientFormsFn } from '@/src/server/client-forms'
import { getFormsFn } from '@/src/server/forms'
import { getAppointmentsFn } from '@/src/server/appointments'
import { ClientDetailClient } from '@/components/admin/client-detail-client'

export const Route = createFileRoute('/_authed/dashboard/clients/$clientId')({
  loader: async ({ params }) => {
    const [clientRes, clientFormsRes, formsRes, appointmentsRes] =
      await Promise.all([
        getClientFn({ data: { id: params.clientId } }),
        getClientFormsFn({ data: { clientId: params.clientId } }),
        getFormsFn(),
        getAppointmentsFn({ data: {} }),
      ])

    if (clientRes.error || !clientRes.client) throw notFound()

    return {
      client: clientRes.client,
      clientForms: clientFormsRes.clientForms,
      availableForms: formsRes.forms,
      appointments: (appointmentsRes.appointments as any[]).filter(
        (a: any) => a.client_id === params.clientId,
      ),
    }
  },
  component: ClientDetailPage,
})

function ClientDetailPage() {
  const { client, clientForms, availableForms, appointments } =
    Route.useLoaderData()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/clients"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Klienci
        </Link>
      </div>

      <ClientDetailClient
        client={client}
        clientForms={clientForms ?? []}
        availableForms={availableForms ?? []}
        appointments={appointments}
      />
    </div>
  )
}
