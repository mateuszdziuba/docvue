import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getSubmissionFn, deleteSubmissionFn } from '@/src/server/submissions'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useState } from 'react'

export const Route = createFileRoute(
  '/_authed/dashboard/submissions/$submissionId',
)({
  loader: async ({ params, context }) => {
    const { isOwner } = context as { isOwner?: boolean }
    const result = await getSubmissionFn({ data: { id: params.submissionId } })
    if (result.error || !result.submission) throw notFound()
    return { submission: result.submission, isOwner: isOwner ?? false }
  },
  component: SubmissionDetailPage,
})

function SubmissionDetailPage() {
  const { submission, isOwner } = Route.useLoaderData()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const sub = submission as any
  const fields = (sub.forms?.schema as any)?.fields ?? []

  async function handleDelete() {
    if (!confirm('Usunąć tę odpowiedź?')) return
    setDeleting(true)
    const result = await deleteSubmissionFn({ data: { id: sub.id } })
    if (result?.error) {
      toast.error(result.error)
      setDeleting(false)
    } else {
      toast.success('Odpowiedź usunięta')
      navigate({ to: '/dashboard/submissions' })
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/submissions"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Odpowiedzi
        </Link>
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            {deleting ? 'Usuwanie…' : 'Usuń'}
          </button>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        <div>
          <h1 className="font-serif text-xl font-normal text-foreground tracking-tight">
            {sub.forms?.title ?? 'Formularz'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sub.client_name ?? 'Anonim'} ·{' '}
            {format(parseISO(sub.created_at), 'd MMMM yyyy, HH:mm', {
              locale: pl,
            })}
          </p>
        </div>

        <div className="divide-y divide-border">
          {fields.map((field: any) => {
            const value = sub.data?.[field.name]
            if (value === undefined || value === null || value === '')
              return null
            return (
              <div key={field.name} className="py-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {field.label}
                </p>
                <p className="text-sm text-foreground">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </p>
              </div>
            )
          })}
        </div>

        {sub.signature && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Podpis
            </p>
            <img
              src={sub.signature}
              alt="Podpis klienta"
              className="max-h-24 rounded-lg border border-border"
            />
          </div>
        )}
      </div>
    </div>
  )
}
