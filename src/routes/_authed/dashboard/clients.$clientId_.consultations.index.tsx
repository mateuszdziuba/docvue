import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { ConsultationHistoryCard } from '@/components/admin/consultation/consultation-history'
import { getClientFn } from '@/src/server/clients'
import { listConsultationsFn } from '@/src/server/consultations'

export const Route = createFileRoute('/_authed/dashboard/clients/$clientId_/consultations/')({
  loader: async ({ params }) => {
    const [clientResult, consultationsResult] = await Promise.all([
      getClientFn({ data: { id: params.clientId } }),
      listConsultationsFn({ data: { clientId: params.clientId } }),
    ])
    if (clientResult.error || !clientResult.client) throw notFound()
    return {
      client: clientResult.client,
      consultations: consultationsResult.consultations,
      consultationsError: consultationsResult.error,
    }
  },
  component: ConsultationsPage,
})

function ConsultationsPage() {
  const { client, consultations, consultationsError } = Route.useLoaderData()

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <Link
          to="/dashboard/clients/$clientId"
          params={{ clientId: client.id }}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Wróć do klienta
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-caps text-primary">Dokument wewnętrzny</p>
            <h1 className="mt-1 font-serif text-3xl font-normal tracking-tight text-foreground">
              Konsultacje
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{client.name}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Widoczne tylko dla personelu
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-info/25 bg-info-container/50 px-4 py-3 text-sm leading-relaxed text-on-info-container">
        Konsultacja holistyczna obejmuje wywiad w pięciu obszarach, mapę twarzy i plan terapii w
        trzech etapach. Każda wizyta może być osobnym wpisem — poprzednie pozostają w historii.
      </div>

      <ConsultationHistoryCard
        clientId={client.id}
        consultations={consultations ?? []}
        error={consultationsError}
      />
    </div>
  )
}
