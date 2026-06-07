import { createFileRoute } from '@tanstack/react-router'
import { getSubmissionsFn } from '@/src/server/submissions'
import { SubmissionsList } from '@/components/admin/submissions-list'

import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().optional(),
})

export const Route = createFileRoute('/_authed/dashboard/submissions/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ query: search.query }),
  loader: async ({ deps }) => {
    const result = await getSubmissionsFn({ data: { query: deps.query } })
    return result
  },
  component: SubmissionsPage,
})

function SubmissionsPage() {
  const { submissions } = Route.useLoaderData()
  const { query } = Route.useSearch()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">Odpowiedzi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Wszystkie wypełnione formularze od klientów
        </p>
      </div>

      <SubmissionsList submissions={submissions} query={query ?? ''} />
    </div>
  )
}
