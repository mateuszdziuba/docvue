import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ClientsList } from '@/components/admin/clients-list'
import { getClientsFn } from '@/src/server/clients'

const searchSchema = z.object({
  query: z.string().optional(),
  new: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
})

export const Route = createFileRoute('/_authed/dashboard/clients/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    query: search.query,
    page: search.query ? 1 : search.page,
  }),
  loader: async ({ deps, context }) => {
    const { isOwner } = context as { isOwner?: boolean }
    const result = await getClientsFn({ data: { query: deps.query, page: deps.page } })
    return { ...result, isOwner: isOwner ?? false }
  },
  component: ClientsPage,
})

function ClientsPage() {
  const { clients, total, page, pageSize, isOwner } = Route.useLoaderData()
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

      <ClientsList
        clients={clients}
        query={query ?? ''}
        defaultOpenAdd={isNew === 'true'}
        isOwner={isOwner}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </div>
  )
}
