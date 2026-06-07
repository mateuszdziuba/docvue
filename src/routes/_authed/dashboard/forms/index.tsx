import { createFileRoute } from '@tanstack/react-router'
import { getFormsFn } from '@/src/server/forms'
import { FormsList } from '@/components/admin/forms-list'

import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().optional(),
})

export const Route = createFileRoute('/_authed/dashboard/forms/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loader: async ({ context }) => {
    const { isOwner } = context as { isOwner?: boolean }
    const result = await getFormsFn()
    return { ...result, isOwner: isOwner ?? false }
  },
  component: FormsPage,
})

function FormsPage() {
  const { forms, isOwner } = Route.useLoaderData()
  const { query } = Route.useSearch()

  const filtered = query
    ? forms.filter((f) => f.title.toLowerCase().includes(query.toLowerCase()))
    : forms

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">Formularze</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Twórz formularze zgód i ankiety dla klientów
        </p>
      </div>

      <FormsList forms={filtered} query={query ?? ''} isOwner={isOwner} />
    </div>
  )
}
