import { createFileRoute } from '@tanstack/react-router'
import { getAppointmentsFn } from '@/src/server/appointments'
import { VisitsList } from '@/components/admin/visits-list'

import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
})

export const Route = createFileRoute('/_authed/dashboard/visits/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: async ({ deps }) => {
    const result = await getAppointmentsFn({ data: { status: deps.status } })
    return result
  },
  component: VisitsPage,
})

function VisitsPage() {
  const { appointments } = Route.useLoaderData()
  const { query, status } = Route.useSearch()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">Wizyty</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Harmonogram i historia wizyt klientów
        </p>
      </div>

      <VisitsList appointments={appointments} query={query ?? ''} statusFilter={status ?? ''} />
    </div>
  )
}
