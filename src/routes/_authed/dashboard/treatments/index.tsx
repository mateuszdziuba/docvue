import { createFileRoute } from '@tanstack/react-router'
import { getTreatmentsFn } from '@/src/server/treatments'
import { TreatmentsList } from '@/components/admin/treatments-list'
import { getFormsFn } from '@/src/server/forms'

import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().optional(),
})

export const Route = createFileRoute('/_authed/dashboard/treatments/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ query: search.query }),
  loader: async ({ deps, context }) => {
    const { isOwner } = context as { isOwner?: boolean }
    const [treatmentsRes, formsRes] = await Promise.all([
      getTreatmentsFn({ data: { query: deps.query } }),
      getFormsFn(),
    ])
    return {
      treatments: treatmentsRes.treatments,
      forms: formsRes.forms,
      isOwner: isOwner ?? false,
    }
  },
  component: TreatmentsPage,
})

function TreatmentsPage() {
  const { treatments, forms, isOwner } = Route.useLoaderData()
  const { query } = Route.useSearch()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">Zabiegi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Zdefiniuj usługi oferowane przez Twój gabinet
        </p>
      </div>

      <TreatmentsList treatments={treatments} forms={forms} query={query ?? ''} isOwner={isOwner} />
    </div>
  )
}
