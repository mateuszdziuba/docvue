import { createFileRoute } from '@tanstack/react-router'
import { getClientsFn } from '@/src/server/clients'
import { ClientsList } from '@/components/admin/clients-list'

import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().optional(),
  new: z.string().optional(),
})

export const Route = createFileRoute('/_authed/dashboard/clients/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ query: search.query }),
  loader: async ({ deps, context }) => {
    const { isOwner } = context as { isOwner?: boolean }
    const result = await getClientsFn({ data: { query: deps.query } })
    return { ...result, isOwner: isOwner ?? false }
  },
  component: ClientsPage,
})

function ClientsPage() {
  const { clients, isOwner } = Route.useLoaderData()
  const search = Route.useSearch()
  const { query, new: isNew } = search

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">Klienci</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Zarządzaj klientami i przypisuj im formularze do wypełnienia
        </p>
      </div>

      <ClientsList clients={clients} query={query ?? ''} defaultOpenAdd={isNew === 'true'} isOwner={isOwner} />
    </div>
  )
}
